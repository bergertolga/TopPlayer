
import { useEffect, useState } from 'react';
import { GameCard } from './ui/GameCard';
import { GameButton } from './ui/GameButton';

interface ModalProps {
  title: string;
  message: string;
  type?: 'info' | 'confirm' | 'error' | 'success';
  onConfirm?: () => void;
  onCancel?: () => void;
}

let modalListener: ((props: ModalProps | null) => void) | null = null;

export const gameModal = {
  alert: (message: string, title = 'Alert') => {
    return new Promise<void>((resolve) => {
      if (modalListener) {
        modalListener({
          title,
          message,
          type: 'info',
          onConfirm: () => {
            if (modalListener) modalListener(null);
            resolve();
          }
        });
      }
    });
  },
  confirm: (message: string, title = 'Confirm') => {
    return new Promise<boolean>((resolve) => {
      if (modalListener) {
        modalListener({
          title,
          message,
          type: 'confirm',
          onConfirm: () => {
            if (modalListener) modalListener(null);
            resolve(true);
          },
          onCancel: () => {
            if (modalListener) modalListener(null);
            resolve(false);
          }
        });
      }
    });
  },
  error: (message: string) => {
    return new Promise<void>((resolve) => {
      if (modalListener) {
        modalListener({
          title: 'Error',
          message,
          type: 'error',
          onConfirm: () => {
            if (modalListener) modalListener(null);
            resolve();
          }
        });
      }
    });
  },
  success: (message: string, title = 'Success') => {
    return new Promise<void>((resolve) => {
      if (modalListener) {
        modalListener({
          title,
          message,
          type: 'success',
          onConfirm: () => {
            if (modalListener) modalListener(null);
            resolve();
          }
        });
      }
    });
  }
};

export function GameModalProvider() {
  const [modal, setModal] = useState<ModalProps | null>(null);

  useEffect(() => {
    modalListener = setModal;
    return () => { modalListener = null; };
  }, []);

  if (!modal) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backdropFilter: 'blur(2px)'
    }}>
      <GameCard title={modal.title} style={{ width: '400px', background: '#2c3e50' }}>
        <p style={{ 
          textAlign: 'center', 
          fontSize: '1.1rem', 
          marginBottom: '2rem', 
          color: modal.type === 'error' ? '#ff6b6b' : 'white' 
        }}>
          {modal.message}
        </p>
        
        <div className="flex justify-center gap-md">
          {modal.type === 'confirm' && (
            <GameButton variant="gray" onClick={modal.onCancel}>Cancel</GameButton>
          )}
          <GameButton 
            variant={modal.type === 'error' ? 'red' : modal.type === 'success' ? 'green' : 'blue'} 
            onClick={modal.onConfirm}
          >
            {modal.type === 'confirm' ? 'Confirm' : 'OK'}
          </GameButton>
        </div>
      </GameCard>
    </div>
  );
}


