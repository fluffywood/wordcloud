import HostView from './components/HostView'
import ParticipantView from './components/ParticipantView'
import { useLivePoll } from './hooks/useLivePoll'

function App() {
  const livePoll = useLivePoll()
  const isParticipant = window.location.pathname.replace(/\/$/, '') === '/join'

  return isParticipant
    ? <ParticipantView livePoll={livePoll} />
    : <HostView livePoll={livePoll} />
}

export default App
