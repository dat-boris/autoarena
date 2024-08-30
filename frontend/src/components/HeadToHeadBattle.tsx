import { Button, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconArrowDown, IconArrowLeft, IconArrowRight, IconBalloon, IconCactus } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useHotkeys } from '@mantine/hooks';
import { useHeadToHeadBattles } from '../hooks/useHeadToHeadBattles.ts';
import { useUrlState } from '../hooks/useUrlState.ts';
import { MarkdownContent } from './MarkdownContent.tsx';
import { NonIdealState } from './NonIdealState.tsx';

type Props = {
  modelAId: number;
  modelBId: number;
};
export function HeadToHeadBattle({ modelAId, modelBId }: Props) {
  const { projectId = -1 } = useUrlState();
  // TODO: loading state?
  const { data: battles, isLoading } = useHeadToHeadBattles({ projectId, modelAId, modelBId });
  const [battleIndex, setBattleIndex] = useState(0);
  const battle = useMemo(() => battles?.[battleIndex], [battles, battleIndex]);

  useEffect(() => {
    setBattleIndex(0);
  }, [modelAId, modelBId]);

  function submitVote(vote: 'A' | 'B' | 'neither') {
    return () => {
      console.log(`vote: ${vote} (index: ${battleIndex})`);
      setBattleIndex(prev => prev + 1);
    };
  }

  useHotkeys([
    ['ArrowLeft', submitVote('A')],
    ['ArrowDown', submitVote('neither')],
    ['ArrowRight', submitVote('B')],
  ]);

  const nBattles = battles?.length ?? 0;
  const iconProps = { size: 18 };
  return !isLoading && nBattles === 0 ? (
    <NonIdealState IconComponent={IconCactus} description="No head-to-head battles between selected models" />
  ) : !isLoading && battleIndex > nBattles - 1 ? (
    <NonIdealState
      IconComponent={IconBalloon}
      description={`Voted on all ${nBattles.toLocaleString()} head-to-head battles between selected models`}
    />
  ) : !isLoading ? (
    <>
      <Stack pb={100}>
        <Group justify="flex-end">
          <Text c="dimmed" size="sm" fs="italic">
            {nBattles} head-to-head battle{nBattles > 1 && 's'} between selected models
          </Text>
        </Group>
        <Paper withBorder p="md">
          <MarkdownContent>{`**Prompt:** ${battle?.prompt}`}</MarkdownContent>
        </Paper>
        <SimpleGrid cols={2}>
          <Paper withBorder p="md" flex={1} style={{ overflow: 'auto' }}>
            <MarkdownContent>{`**Response A:**\n\n${battle?.response_a}`}</MarkdownContent>
          </Paper>
          <Paper withBorder p="md" flex={1} style={{ overflow: 'auto' }}>
            <MarkdownContent>{`**Response B:**\n\n${battle?.response_b}`}</MarkdownContent>
          </Paper>
        </SimpleGrid>
      </Stack>
      <Stack
        bg="gray.0"
        p="md"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderTop: '1px solid var(--mantine-color-gray-3)' }}
      >
        <Stack align="center" gap="xs">
          <Text fw="bold">Which response is better?</Text>
          <SimpleGrid cols={3} spacing="xs">
            <Button leftSection={<IconArrowLeft {...iconProps} />} onClick={submitVote('A')}>
              Left
            </Button>
            <Button leftSection={<IconArrowDown {...iconProps} />} onClick={submitVote('neither')}>
              Tie
            </Button>
            <Button rightSection={<IconArrowRight {...iconProps} />} onClick={submitVote('B')}>
              Right
            </Button>
          </SimpleGrid>
        </Stack>
      </Stack>
    </>
  ) : (
    <></>
  );
}
