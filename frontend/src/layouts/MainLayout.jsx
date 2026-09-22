import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopHeader from '../components/TopHeader'

export default function MainLayout() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <TopHeader />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}