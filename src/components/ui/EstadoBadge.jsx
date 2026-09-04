import { ESTADO_LABEL, ESTADO_BADGE_CLASS } from '../../features/casos/constants';

export default function EstadoBadge({ estado, size = 'md' }) {
  const style = size === 'lg' ? { fontSize: '13px', padding: '7px 14px' } : undefined;
  return (
    <span className={`badge ${ESTADO_BADGE_CLASS[estado]}`} style={style}>
      <span className="dot" />
      {ESTADO_LABEL[estado]}
    </span>
  );
}
