import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SceneScreen from './pages/SceneScreen.jsx'
import PermissaoLocalizacao from './pages/PermissaoLocalizacao.jsx'
import Mapa from './pages/Mapa.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SceneScreen />} />
        <Route path="/permissao-localizacao" element={<PermissaoLocalizacao />} />
        <Route path="/mapa" element={<Mapa />} />
      </Routes>
    </BrowserRouter>
  )
}
