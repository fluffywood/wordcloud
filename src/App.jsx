import HostView from './components/HostView'
import ModerationView from './components/ModerationView'
import ParticipantView from './components/ParticipantView'
import { useLivePoll } from './hooks/useLivePoll'

function PollView({ isParticipant }) {
  const livePoll = useLivePoll()

  return isParticipant
    ? <ParticipantView livePoll={livePoll} />
    : <HostView livePoll={livePoll} />
}

function App() {
  const pathname = window.location.pathname.replace(/\/$/, '')
  if (pathname === '/moderate') return <ModerationView />
  return <PollView isParticipant={pathname === '/join'} />
}

export default App
