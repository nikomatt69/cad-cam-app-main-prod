
import type { FC } from 'react';
import { useEffect, useState } from 'react';

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure
} from '@nextui-org/react';
import * as React from 'react';
import { BookOpen } from 'react-feather';
import UnifiedTextToCAD from '../ai/UnifiedTextToCAD';


type Props = {
  
};

const AIModal: FC<Props> = () => {
  const [show, setShow] = useState(false);


  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  return (
    <div className="flex flex-col gap-1 ">
      <button type="button" onClick={onOpen}>
        <div className="lt-text-gray-500 ml-1 flex items-center font-bold">
          <BookOpen className="h-4 w-4" />
        </div>
      </button>
      <Modal
        isOpen={isOpen}
        placement={'bottom'}
        className='pb-9'
        backdrop="blur"
        onOpenChange={onOpenChange}
        autoFocus={false}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: {
                duration: 0.3,
                ease: 'easeOut'
              }
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: {
                duration: 0.2,
                ease: 'easeIn'
              }
            }
          }
        }}
      >
        <ModalContent
          autoFocus={false}
          className="h-[flex] max-h-[73vh]  justify-between rounded-xl border border-b-0 border-gray-500 bg-white dark:bg-gray-900 "
        >
          <ModalHeader autoFocus />
          <ModalBody
            autoFocus={false}
            className="max-w-lg overflow-y-auto overflow-y-hidden   bg-white dark:bg-gray-900"
          >
            
            <UnifiedTextToCAD />
           
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default AIModal;
