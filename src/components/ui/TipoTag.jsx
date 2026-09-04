import { TIPO_SOLICITUD_TAG_CLASS, TIPO_SOLICITUD_TAG_LABEL, TIPO_SOLICITUD_LABEL } from '../../features/casos/constants';

export default function TipoTag({ tipo, full = false, size = 'md' }) {
  const style = size === 'lg' ? { fontSize: '12.5px', padding: '6px 12px' } : undefined;
  return (
    <span className={`type-tag ${TIPO_SOLICITUD_TAG_CLASS[tipo]}`} style={style}>
      {full ? TIPO_SOLICITUD_LABEL[tipo] : TIPO_SOLICITUD_TAG_LABEL[tipo]}
    </span>
  );
}
