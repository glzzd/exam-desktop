import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '@/assets/img/007.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings, ChevronDown } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isGroupActive = (paths) => {
    return paths.some(path => location.pathname.startsWith(path));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const displayName = user ? (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.username || user.email || 'İstifadəçi')) : '';

  return (
    <header className="border-b bg-white shadow-sm h-16">
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Link to="/">
            <img 
              src={logo} 
              alt="Logo" 
              className="h-10 w-auto" 
            />
          </Link>
        </div>

        {/* Center: Menu */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors ${
              isActive('/') 
                ? 'text-blue-600 font-bold' 
                : 'text-gray-700 hover:text-blue-600'
            }`}
          >
            Məlumat lövhəsi
          </Link>
          <Link 
            to="/active-exam" 
            className={`text-sm font-medium transition-colors ${
              isActive('/active-exam') 
                ? 'text-blue-600 font-bold' 
                : 'text-gray-700 hover:text-blue-600'
            }`}
          >
            Cari imtahan
          </Link>

          <Link 
            to="/exam-types" 
            className={`text-sm font-medium transition-colors ${
              isActive('/exam-types') 
                ? 'text-blue-600 font-bold' 
                : 'text-gray-700 hover:text-blue-600'
            }`}
          >
            İmtahan növləri
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger 
              className={`flex items-center text-sm font-medium transition-colors focus:outline-none ${
                isGroupActive(['/results']) 
                  ? 'text-blue-600 font-bold' 
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Nəticələr <ChevronDown className="ml-1 h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem 
                onClick={() => navigate('/results')}
                className={isActive('/results') ? 'text-blue-600 bg-blue-50 font-medium' : ''}
              >
                Bütün nəticələr
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/results/current')}
                className={isActive('/results/current') ? 'text-blue-600 bg-blue-50 font-medium' : ''}
              >
                Cari imtahan nəticələri
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger 
              className={`flex items-center text-sm font-medium transition-colors focus:outline-none ${
                isGroupActive(['/system']) 
                  ? 'text-blue-600 font-bold' 
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Sistem tənzimləməsi <ChevronDown className="ml-1 h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem 
                onClick={() => navigate('/system/employees')}
                className={isActive('/system/employees') ? 'text-blue-600 bg-blue-50 font-medium' : ''}
              >
                Əməkdaşlar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/system/candidates')}
                className={isActive('/system/candidates') ? 'text-blue-600 bg-blue-50 font-medium' : ''}
              >
                Namizədlər
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/system/exam-types')}
                className={isActive('/system/exam-types') ? 'text-blue-600 bg-blue-50 font-medium' : ''}
              >
                İmtahan növləri
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/system/structures')}
                className={isActive('/system/structures') ? 'text-blue-600 bg-blue-50 font-medium' : ''}
              >
                Strukturlar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/system/questions')}
                className={isActive('/system/questions') ? 'text-blue-600 bg-blue-50 font-medium' : ''}
              >
                Suallar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right: User Info & Dropdown */}
        <div className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 h-auto py-1 px-2 hover:bg-gray-100 rounded-lg">
                  <Avatar className="h-10 w-10 border border-gray-200">
                    <AvatarImage src={user.avatar} alt={user.username} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="hidden md:flex flex-col items-start text-left">
                    <span className="text-sm font-semibold text-gray-900 leading-none">
                      {displayName}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      {typeof user.role === 'object' ? user.role?.name : user.role || 'İstifadəçi'}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email || user.username}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Tənzimləmələr</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Çıxış</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate('/login')}>Daxil ol</Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
