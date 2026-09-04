import { useState } from 'react';
import { IconComment, IconEye } from '../../../components/ui/icons';

function formatFecha(iso) {
  return new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function CommentComposer({ comentarios, onAgregar, enviando }) {
  const [texto, setTexto] = useState('');
  const [visible, setVisible] = useState(false);
  const recientes = comentarios.slice(-2);

  async function enviar() {
    if (!texto.trim()) return;
    await onAgregar({ texto: texto.trim(), visible_para_estudiante: visible });
    setTexto('');
    setVisible(false);
  }

  return (
    <div className="sidebar-card">
      <h3>
        <IconComment />
        Agregar comentario
      </h3>

      {recientes.map((c) => (
        <div className={`comment-item ${c.visible_para_estudiante ? 'visible' : 'internal'}`} style={{ marginBottom: 12 }} key={c.id}>
          <div className="comment-head">
            <span className="comment-author">{c.autor}</span>
            <span className={`comment-tag ${c.visible_para_estudiante ? 'visible' : 'internal'}`}>
              {c.visible_para_estudiante ? 'Visible al estudiante' : 'Interno'}
            </span>
          </div>
          <div className="comment-text">{c.texto}</div>
          <div className="comment-time">{formatFecha(c.fecha)}</div>
        </div>
      ))}

      <div className="comment-input-box">
        <textarea
          placeholder="Escribe un comentario para el estudiante/tercero o el equipo interno..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="comment-actions">
          <label className="toggle-visible">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
            <IconEye />
            Visible para el estudiante
          </label>
          <button className="btn-small" onClick={enviar} disabled={enviando || !texto.trim()}>
            {enviando ? 'Enviando...' : 'Comentar'}
          </button>
        </div>
      </div>
    </div>
  );
}
