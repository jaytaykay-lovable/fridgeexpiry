import { NavLink, useLocation } from 'react-router-dom';
import { Home, Camera, User } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();

  const links = [
    { to: '/', icon: Home, label: 'Fridge' },
    { to: '/camera', icon: Camera, label: 'Add' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="bottom-nav">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={() =>
            `bottom-nav-item ${location.pathname === to ? 'active' : ''}`
          }
        >
          <Icon size={22} />
          <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
