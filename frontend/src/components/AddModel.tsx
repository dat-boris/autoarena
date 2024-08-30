import { Button, Code, FileInput, Modal, TextInput, Text, Stack, Group } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import { useUploadModelResults } from '../hooks/useUploadModelResults.ts';
import { useUrlState } from '../hooks/useUrlState.ts';

export function AddModel() {
  const { projectId = -1 } = useUrlState(); // TODO: handle unset state?
  const [isOpen, { toggle, close }] = useDisclosure(false);
  const { mutate: uploadModelResults } = useUploadModelResults({ projectId });

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');

  const isDisabled = file == null || name === '';
  return (
    <>
      <Button variant="light" leftSection={<IconPlus size={18} />} onClick={toggle}>
        Add Model
      </Button>
      <Modal
        opened={isOpen}
        centered
        onClose={close}
        title="Add Model" // TODO: better title?
        transitionProps={{ transition: 'fade', duration: 100 }} // TODO: share these
      >
        <Stack>
          <FileInput
            label="Model Results"
            description={
              <Text inherit>
                A <Code>.csv</Code> file containing <Code>prompt</Code> and <Code>response</Code> columns
              </Text>
            }
            placeholder="Select model results file..."
            accept="text/csv"
            value={file}
            onChange={setFile}
          />
          <TextInput
            label="Model Name"
            placeholder="Enter model name..."
            value={name}
            onChange={event => setName(event.currentTarget.value)}
            flex={1}
          />
          <Group justify="space-between">
            <Button variant="default" onClick={close} flex={1}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (file != null) {
                  uploadModelResults([file, name]);
                }
                close();
              }}
              disabled={isDisabled}
              flex={1}
            >
              Upload
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
