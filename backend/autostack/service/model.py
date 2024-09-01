import numpy as np
import pandas as pd

from autostack.api import api
from autostack.store.database import get_database_connection


class ModelService:
    @staticmethod
    def get_all(project_id: int) -> list[api.Model]:
        with get_database_connection() as conn:
            df_model = conn.execute(
                """
                WITH datapoint_count AS (
                    SELECT m.id AS model_id, COUNT(1) AS datapoint_count
                    FROM model m
                    JOIN result r ON m.id = r.model_id
                    GROUP BY m.id
                ), vote_count_a AS (
                    SELECT m.id AS model_id, COUNT(1) AS vote_count
                    FROM model m
                    JOIN result r ON r.model_id = m.id
                    JOIN battle b ON r.id = b.result_a_id
                    GROUP BY m.id
                ), vote_count_b AS (
                    SELECT m.id AS model_id, COUNT(1) AS vote_count
                    FROM model m
                    JOIN result r ON r.model_id = m.id
                    JOIN battle b ON r.id = b.result_b_id
                    GROUP BY m.id
                )
                SELECT
                    id,
                    name,
                    created,
                    elo,
                    q025,
                    q975,
                    IFNULL(dc.datapoint_count, 0) AS datapoints,
                    IFNULL(vca.vote_count, 0) + IFNULL(vcb.vote_count, 0) AS votes
                FROM model m
                LEFT JOIN datapoint_count dc ON m.id = dc.model_id
                LEFT JOIN vote_count_a vca ON m.id = vca.model_id
                LEFT JOIN vote_count_b vcb ON m.id = vcb.model_id
                WHERE project_id = ?
            """,
                [project_id],
            ).df()
        df_model = df_model.replace({np.nan: None})
        return [api.Model(**r) for _, r in df_model.iterrows()]

    @staticmethod
    def delete(model_id: int) -> None:
        params = dict(model_id=model_id)
        with get_database_connection() as conn:
            conn.execute(
                """
                DELETE FROM battle b
                WHERE EXISTS (
                    SELECT 1
                    FROM result r
                    WHERE r.model_id = $model_id
                    AND (b.result_a_id = r.id OR b.result_b_id = r.id)
                )
                """,
                params,
            )
            conn.execute("DELETE FROM result WHERE model_id = $model_id", params)
            conn.execute("DELETE FROM model WHERE id = $model_id", params)

    @staticmethod
    def get_df_result(model_id: int) -> pd.DataFrame:
        with get_database_connection() as conn:
            df_result = conn.execute(
                """
                SELECT
                    m.name AS model,
                    r.prompt AS prompt,
                    r.response AS result
                FROM model m
                JOIN result r ON r.model_id = m.id
                WHERE m.id = $model_id
            """,
                dict(model_id=model_id),
            ).df()
        return df_result

    @staticmethod
    def get_df_head_to_head(model_id: int) -> pd.DataFrame:
        with get_database_connection() as conn:
            df_h2h = conn.execute(
                """
                SELECT
                    ra.prompt,
                    ma.name AS model_a,
                    mb.name AS model_b,
                    ra.response AS response_a,
                    rb.response AS response_b,
                    j.name AS judge,
                    b.winner
                FROM battle b
                JOIN judge j ON b.judge_id = j.id
                JOIN result ra ON ra.id = b.result_a_id
                JOIN result rb ON rb.id = b.result_b_id
                JOIN model ma ON ma.id = ra.model_id
                JOIN model mb ON mb.id = rb.model_id
                WHERE ma.id = $model_id
                OR mb.id = $model_id
            """,
                dict(model_id=model_id),
            ).df()
        return df_h2h

    @staticmethod
    def get_head_to_head_stats(model_id: int) -> list[api.ModelHeadToHeadStats]:
        with get_database_connection() as conn:
            df_h2h_stats = conn.execute(
                """
                WITH battle_result AS (
                    SELECT
                        ra.model_id,
                        rb.model_id AS other_model_id,
                        b.judge_id,
                        CASE WHEN b.winner = 'A' THEN TRUE WHEN b.winner = 'B' THEN FALSE END AS won
                    FROM battle b
                    JOIN result ra ON ra.id = b.result_a_id
                    JOIN result rb ON rb.id = b.result_b_id
                    UNION ALL
                    SELECT
                        rb.model_id,
                        ra.model_id AS other_model_id,
                        b.judge_id,
                        CASE WHEN b.winner = 'B' THEN TRUE WHEN b.winner = 'A' THEN FALSE END AS won
                    FROM battle b
                    JOIN result ra ON ra.id = b.result_a_id
                    JOIN result rb ON rb.id = b.result_b_id
                )
                SELECT
                    m_other.id AS other_model_id,
                    m_other.name AS other_model_name,
                    j.id AS judge_id,
                    j.name AS judge_name,
                    SUM(IF(br.won IS TRUE, 1, 0)) AS count_wins,
                    SUM(IF(br.won IS FALSE, 1, 0)) AS count_losses,
                    SUM(IF(br.won IS NULL, 1, 0)) AS count_ties
                FROM battle_result br
                JOIN judge j ON j.id = br.judge_id
                JOIN model m ON m.id = br.model_id
                JOIN model m_other ON m_other.id = br.other_model_id
                WHERE m.id = $model_id
                GROUP BY m.id, m.name, m_other.id, m_other.name, j.id, j.name
            """,
                dict(model_id=model_id),
            ).df()
        return [api.ModelHeadToHeadStats(**r) for _, r in df_h2h_stats.iterrows()]
