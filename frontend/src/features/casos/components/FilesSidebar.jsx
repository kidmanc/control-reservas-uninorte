import { IconFile, IconCheckCircle } from '../../../components/ui/icons';

export default function FilesSidebar({ archivos, onVerArchivo, archivoAbriendoId }) {
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
              <div className="attach-name">{archivo.nombre_archivo}</div>
              <div className="attach-desc">
                {archivo.descripcion ? `${archivo.descripcion} · ` : ''}
                Subido por {archivo.subido_por === 'tercero' ? 'el tercero' : 'el estudiante'}
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '7px 10px', fontSize: 12 }}
              onClick={() => onVerArchivo(archivo)}
              disabled={archivoAbriendoId === archivo.id}
            >
              {archivoAbriendoId === archivo.id ? 'Abriendo…' : 'Ver / descargar'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
