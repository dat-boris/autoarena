import pandas as pd
import pytest

from autoarena.api import api
from autoarena.service.head_to_head import HeadToHeadService
from autoarena.service.judge import JudgeService
from autoarena.service.model import ModelService
from autoarena.service.task import TaskService
from tests.integration.judge.conftest import TEST_JUDGE_MODEL_NAMES

TEST_QUESTIONS = [
    dict(prompt="What is 2+2?", wrong="100 million", right="4"),
    dict(prompt="Is Python 2 still supported?", wrong="Of course", right="Not by PSF"),
    dict(prompt="What country shares the longest land border with the USA?", wrong="Jamaica", right="Canada"),
    dict(prompt="Who directed Fantastic Mr. Fox?", wrong="Christopher Nolan", right="Wes Anderson"),
    dict(prompt="Does the Earth orbit the Sun?", wrong="Of course not", right="Yes"),
]


@pytest.fixture
def model_results(project_slug: str) -> tuple[int, int]:
    create_judge_request = api.CreateJudgeRequest(
        judge_type=api.JudgeType.OPENAI,
        name=TEST_JUDGE_MODEL_NAMES[api.JudgeType.OPENAI],
        model_name=TEST_JUDGE_MODEL_NAMES[api.JudgeType.OPENAI],
        system_prompt=JudgeService.get_default_system_prompt(),
        description="Just for testing",
    )
    JudgeService.create(project_slug, create_judge_request)  # should be enabled by default
    df_good_answer = pd.DataFrame.from_records(TEST_QUESTIONS).rename(columns=dict(right="response"))
    model_a_id = ModelService.upload_results(project_slug, "good-answers", df_good_answer).id
    df_bad_answer = pd.DataFrame.from_records(TEST_QUESTIONS).rename(columns=dict(wrong="response"))
    model_b_id = ModelService.upload_results(project_slug, "bad-answers", df_bad_answer).id
    return model_a_id, model_b_id


# test here rather than via API as synchronous autojudging is not exposed via the API
def test__task__auto_judge(project_slug: str, model_results: tuple[int, int]) -> None:
    model_a_id, model_b_id = model_results
    TaskService.auto_judge(project_slug, model_a_id, "good-answers")

    # assert that judging happened as expected
    models = ModelService.get_all(project_slug)
    model_a = [m for m in models if m.id == model_a_id][0]
    model_b = [m for m in models if m.id == model_b_id][0]
    assert model_a.elo > model_b.elo
    assert model_a.votes == len(TEST_QUESTIONS)
    assert model_b.votes == len(TEST_QUESTIONS)

    # assert that the task was created and updated
    tasks = TaskService.get_all(project_slug)
    assert len(tasks) == 1
    assert tasks[0].task_type is api.TaskType.AUTO_JUDGE
    assert tasks[0].progress == 1
    assert len(tasks[0].status) > 0


def test__task__recompute_leaderboard(project_slug: str, model_results: tuple[int, int]) -> None:
    model_a_id, model_b_id = model_results
    h2hs = HeadToHeadService.get(project_slug, api.HeadToHeadsRequest(model_a_id=model_a_id, model_b_id=model_b_id))
    for h2h in h2hs:
        submit_judgement_request = api.HeadToHeadJudgementRequest(
            result_a_id=h2h.result_a_id,
            result_b_id=h2h.result_b_id,
            winner="A",
        )
        HeadToHeadService.submit_judgement(project_slug, submit_judgement_request)
    models_before = ModelService.get_all(project_slug)
    TaskService.recompute_leaderboard(project_slug)
    models_after = ModelService.get_all(project_slug)

    # assert that recomputation reproduced the same scores as the step-by-step from sequential judgements
    assert all(before.elo == after.elo for before, after in zip(models_before, models_after))
    assert all(before.votes == after.votes == len(h2hs) for before, after in zip(models_before, models_after))

    # assert that the task was created and updated
    tasks = TaskService.get_all(project_slug)
    assert len(tasks) == 1
    assert tasks[0].task_type is api.TaskType.RECOMPUTE_LEADERBOARD
    assert tasks[0].progress == 1
    assert len(tasks[0].status) > 0
