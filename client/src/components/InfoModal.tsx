import { useEffect, useRef } from 'react';

interface InfoModalProps {
  onClose: () => void;
}

export const InfoModal = ({ onClose }: InfoModalProps) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Close on Escape and move focus into the dialog when it opens.
  useEffect(() => {
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close instructions"
        >
          &times;
        </button>

        <h2 id="info-modal-title">About AI Object Tracker</h2>
        <p>
          This application streams your webcam feed to a local backend server
          where a <strong>COCO-SSD machine learning model</strong> analyzes the
          frames to detect common objects in real-time.
        </p>

        <h3>How to use:</h3>
        <ol>
          <li>Ensure your backend Express server (Port 5000) is running.</li>
          <li>
            Wait for the server status to read <strong>"Online &amp; Tracking"</strong>.
          </li>
          <li>Click <strong>Turn On Camera</strong> and allow browser permissions.</li>
          <li>
            Point your camera at everyday objects (e.g. cell phone, cup, person)
            to see the AI detect them.
          </li>
        </ol>

        <div className="modal-actions">
          <button type="button" className="button button-primary" onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};
