import { X } from "./icons";

export function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-header">
      <h2>{title}</h2>
      <button
        className="icon-button"
        aria-label="Close dialog"
        onClick={onClose}
      >
        <X size={20} />
      </button>
    </div>
  );
}
