export default function ConnectionBadge({ connection }) {
  const content = {
    live: ['实时同步', 'live'],
    connecting: ['正在连接', 'pending'],
    reconnecting: ['正在重连', 'pending'],
    offline: ['连接中断', 'offline'],
  }[connection] || ['正在连接', 'pending']

  return (
    <span className={`connection-badge connection-badge--${content[1]}`}>
      <i aria-hidden="true" />
      {content[0]}
    </span>
  )
}
