import { useSearchParams } from 'react-router-dom';
import { Button, Center, Group, Divider, Select, Stack } from '@mantine/core';
import { useMemo } from 'react';
import { IconClick } from '@tabler/icons-react';
import { useModels } from '../hooks/useModels.ts';
import { useUrlState } from '../hooks/useUrlState.ts';
import { HeadToHeadBattle } from './HeadToHeadBattle.tsx';
import { NonIdealState } from './NonIdealState.tsx';

export function HeadToHead() {
  const { projectId } = useUrlState();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlModelAId = searchParams.get('modelA');
  const urlModelBId = searchParams.get('modelB');
  const { data: models } = useModels(projectId);
  const allSelectModels = useMemo(
    () =>
      (models ?? []).map(({ id, name }) => ({
        value: String(id),
        label: name,
      })),
    [models]
  );
  const modelA = models?.find(({ id }) => Number(urlModelAId) === id);
  const modelB = models?.find(({ id }) => Number(urlModelBId) === id);

  function onChange(position: 'A' | 'B', newId: number | undefined) {
    if (Number.isNaN(newId)) {
      return;
    }
    const existingParams =
      position === 'A'
        ? urlModelBId != null
          ? { modelB: urlModelBId }
          : {}
        : urlModelAId != null
          ? { modelA: urlModelAId }
          : {};
    const newParams = newId == null ? {} : position === 'A' ? { modelA: newId } : { modelB: newId };
    const newSearchParams = { ...existingParams, ...newParams } as Record<string, string>; // TODO: casting...
    setSearchParams(new URLSearchParams(newSearchParams));
  }

  function onRandomize(position: 'A' | 'B') {
    const otherIds = new Set([modelA?.id, modelB?.id].filter(id => id != null));
    // try 100 times to find an ID that doesn't conflict with a selected ID
    for (let i = 0; i < 100; i++) {
      const randomIndex = Math.floor(Math.random() * (models?.length ?? 0));
      const randomId = models?.[randomIndex]?.id;
      if (randomId != null && !otherIds.has(randomId)) {
        onChange(position, randomId);
        return;
      }
    }
  }

  const noModels = allSelectModels.length < 1;
  const noMoreModels = allSelectModels.length - (modelA != null ? 1 : 0) - (modelB != null ? 1 : 0) < 1;
  return (
    <Center p="lg">
      <Stack w={1080} /* TODO: should be max width */>
        <Group justify="space-between" grow>
          <Group align="flex-end" justify="space-between">
            <Select
              label="Model A"
              placeholder="Select Model"
              data={
                modelB == null
                  ? allSelectModels
                  : allSelectModels.map(option =>
                      option.value === String(modelB.id) ? { ...option, disabled: true } : option
                    )
              }
              value={modelA != null ? String(modelA.id) : undefined}
              onChange={value => onChange('A', Number(value))}
              disabled={noModels}
              searchable
              flex={1}
            />
            <Button variant="light" disabled={noMoreModels} onClick={() => onRandomize('A')}>
              Random
            </Button>
          </Group>
          <Group align="flex-end" justify="space-between">
            <Select
              label="Model B"
              placeholder="Select Model"
              data={
                modelA == null
                  ? allSelectModels
                  : allSelectModels.map(option =>
                      option.value === String(modelA.id) ? { ...option, disabled: true } : option
                    )
              }
              value={modelB != null ? String(modelB.id) : undefined}
              onChange={value => onChange('B', Number(value))}
              disabled={noModels}
              searchable
              flex={1}
            />
            <Button variant="light" disabled={noMoreModels} onClick={() => onRandomize('B')}>
              Random
            </Button>
          </Group>
        </Group>
        <Divider />
        {modelA != null && modelB != null ? (
          <HeadToHeadBattle modelAId={modelA.id} modelBId={modelB.id} />
        ) : (
          <NonIdealState IconComponent={IconClick} description="Select two models to compare head-to-head" />
        )}
      </Stack>
    </Center>
  );
}
