import { NavLink } from 'react-router-dom';
import { Home, Camera, User, BookOpen, BarChart3 } from 'lucide-react';

export default function BottomNav() {
  const links = [
    { to: '/', icon: Home, label: 'Fridge' },
    { to: '/recipes', icon: BookOpen, label: 'Recipes' },
    { to: '/camera', icon: Camera, label: 'Add' },
    { to: '/analytics', icon: BarChart3, label: 'Stats' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="bottom-nav">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive, isPending }) =>
            `bottom-nav-item ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`
          }
        >
          <Icon size={22} />
          <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
