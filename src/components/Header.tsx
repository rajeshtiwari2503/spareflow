import { useRouter } from 'next/router';
import { useState } from 'react';
import Logo from './Logo';
import { Button } from './ui/button';
import { Menu, X, User, LogIn, UserPlus } from 'lucide-react';

const Header = () => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/features' },
    { name: 'Spare Parts', href: '/spare-parts' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMenuOpen(false);
  };

  return (
    <header className="w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="cursor-pointer" onClick={() => handleNavigation("/")}>
            <Logo size="md" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className="text-gray-700 hover:text-spareflow-blue font-medium transition-colors duration-200"
              >
                {item.name}
              </button>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => handleNavigation('/auth/login')}
              className="text-gray-700 hover:text-spareflow-blue"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Button>
            <Button
              onClick={() => handleNavigation('/auth/register')}
              className="spareflow-btn-primary"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Sign Up
            </Button>
            <Button
              variant="outline"
              onClick={() => handleNavigation('/dashboard')}
              className="border-spareflow-blue text-spareflow-blue hover:bg-spareflow-blue hover:text-white"
            >
              <User className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className="text-left text-gray-700 hover:text-spareflow-blue font-medium transition-colors duration-200"
                >
                  {item.name}
                </button>
              ))}
              <div className="pt-4 border-t border-gray-200 flex flex-col space-y-3">
                <Button
                  variant="ghost"
                  onClick={() => handleNavigation('/auth/login')}
                  className="justify-start text-gray-700 hover:text-spareflow-blue"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
                <Button
                  onClick={() => handleNavigation('/auth/register')}
                  className="spareflow-btn-primary justify-start"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Sign Up
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleNavigation('/dashboard')}
                  className="justify-start border-spareflow-blue text-spareflow-blue hover:bg-spareflow-blue hover:text-white"
                >
                  <User className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;