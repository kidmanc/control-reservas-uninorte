import { useState } from 'react';
import { IconFile, IconCheckCircle, IconUpload, IconEye } from '../../../components/ui/icons';

const EXTENSIONES_INTERNAS = ['pdf', 'jpg', 'jpeg', 'png', 'xls', 'xlsx', 'csv'];
const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;

function quienSubio(subidoPor) {
  if (subidoPor === 'tercero') return 'el tercero';
  if (subidoPor === 'estudiante') return 'el estudiante';
  return subidoPor;
}

export default function FilesSidebar({ archivos, onVerArchivo, archivoAbriendoId, puedeAdjuntar, onAdjuntar, adjuntando }) {
  const [descripcion, setDescripcion] = useState('');
  const [visible, setVisible] = useState(false);

  async function onElegirArchivo(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo || !onAdjuntar) return;
    const extension = (archivo.name.split('.').pop() || '').toLowerCase();
    if (!EXTENSIONES_INTERNAS.includes(extension)) {
      onAdjuntar(null);
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      onAdjuntar(null);
      return;
    }
    await onAdjuntar({ archivo, descripcion: descripcion.trim() || null, visible });
    setDescripcion('');
    setVisible(false);
  }

  return (
    <div className="sidebar-card">
      <h3>
        <IconFile />
        Archivos adjuntos
      </h3>
      {archivos.length === 0 && <p className="empty-hint">Este caso todavía no tiene archivos adjuntos.</p>}
      {archivos.map((archivo) => {
        const esSoporteRepresentacion = (archivo.descripcion ?? '').toLowerCase().includes('representación');
        return (
          <div className="attach-item" key={archivo.id}>
            <button
              type="button"
              className="attach-file-trigger"
              onClick={() => onVerArchivo(archivo)}
              disabled={archivoAbriendoId === archivo.id}
              aria-label={`Abrir o descargar ${archivo.nombre_archivo}`}
              title="Abrir o descargar archivo"
            >
            <div
              className="attach-icon"
              style={
                esSoporteRepresentacion
                  ? { background: 'var(--falta-bg)', color: '#8a6d00' }
                  : { background: 'var(--verde-bg)', color: 'var(--verde)' }
              }
            >
              {esSoporteRepresentacion ? <IconCheckCircle /> : <IconFile />}
            </div>
            <div style={{ flex: 1 }}>
              <div className="attach-name">{archivoAbriendoId === archivo.id ? 'Abriendo archivo…' : archivo.nombre_archivo}</div>
              <div className="attach-desc">
                {archivo.descripcion ? `${archivo.descripcion} · ` : ''}
                Subido por {quienSubio(archivo.subido_por)} · {archivo.visible_para_estudiante ? 'Visible al estudiante' : 'Interno'}
              </div>
            </div>
            </button>
          </div>
        );
      })}
      {puedeAdjuntar && (
        <div className="comment-input-box" style={{ marginTop: 12 }}>
          <input
            type="text"
            placeholder="Descripción del documento (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={adjuntando}
            style={{ width: '100%', marginBottom: 8 }}
          />
          <label className="upload-zone" style={{ display: 'block', cursor: 'pointer' }}>
            <div className="upload-icon">
              <IconUpload />
            </div>
            <div className="main-text">{adjuntando ? 'Subiendo...' : 'Adjuntar documento (PDF, imagen o Excel)'}</div>
            <div className="sub-text">XLS, XLSX, CSV, PDF, JPG, PNG · máximo 10 MB</div>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.csv"
              style={{ display: 'none' }}
              disabled={adjuntando}
              onChange={onElegirArchivo}
            />
          </label>
          <div className="comment-actions">
            <label className="toggle-visible">
              <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} disabled={adjuntando} />
              <IconEye />
              Visible para el estudiante
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
