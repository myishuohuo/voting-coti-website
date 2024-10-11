import { useState } from 'react';
import './Modal.css'; // 用于样式

const Modal = ({ show, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [objective, setObjective] = useState('');
    const [details, setDetails] = useState('');

    const handleSave = () => {
        const data = { title, objective, details };
        console.log('Submitted inner Data:', data);
        onSave(data);
        setTitle('');
        setObjective('');
        setDetails('');
        onClose(data);
    };

    if (!show) return null;

    return (
        <div className="modal-overlay">
            <div className="modal">
                <button className="close-button" onClick={onClose}>×</button>
                <div className="modal-content">
                    <h2>Proposal Information</h2>
                    <label>
                        <label className="form-label">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="modal-input"
                        />
                    </label>
                    <label>
                        <label className="form-label">Objective</label>
                        <textarea
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            className="modal-textarea"
                        />
                    </label>
                    <label>
                        <label className="form-label">Details</label>
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            className="modal-textarea"
                        />
                    </label>
                </div>
                <div className="modal-actions">
                    <button className="save-button" onClick={handleSave}>Submit</button>
                </div>
            </div>
        </div>
    );
};

export default Modal;