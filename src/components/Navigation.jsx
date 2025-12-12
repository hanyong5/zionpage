import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMember } from "../pages/context/MemberContext";
import { Button } from "@/components/ui/button";

function Navigation() {
  const { memberData, user, logout } = useMember();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate("/member/login");
      setIsMobileMenuOpen(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="flex justify-between items-center p-4 border-b">
      <h1 className="text-2xl font-bold">
        <Link to="/">Yerim</Link>
      </h1>

      {/* 데스크톱 메뉴 */}
      <div className="hidden md:flex gap-4 items-center">
        {user && memberData && (
          <>
            <div className="text-sm font-medium text-muted-foreground">
              {memberData.name}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              로그아웃
            </Button>
          </>
        )}
        {!user && <Link to="/member/login">로그인</Link>}
        <Link to="/">Home</Link>
        <Link to="/calen">Calendar</Link>
        <Link to="/attend">출석부</Link>
        <Link to="/yerim">Attend</Link>
        <Link to="/point">Point</Link>
        <Link to="/member">Member</Link>
      </div>

      {/* 모바일 햄버거 버튼 */}
      <button
        className="md:hidden p-2 rounded-md hover:bg-accent transition-colors"
        onClick={toggleMobileMenu}
        aria-label="메뉴 열기"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isMobileMenuOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* 모바일 메뉴 */}
      {isMobileMenuOpen && (
        <>
          {/* 오버레이 */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={closeMobileMenu}
          />
          {/* 메뉴 패널 */}
          <div className="fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-50 md:hidden transform transition-transform">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">메뉴</h2>
              <button
                onClick={closeMobileMenu}
                className="p-2 rounded-md hover:bg-accent"
                aria-label="메뉴 닫기"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col p-4 gap-2">
              {user && memberData && (
                <>
                  <div className="text-sm font-medium text-muted-foreground p-2">
                    {memberData.name}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full justify-start"
                  >
                    로그아웃
                  </Button>
                </>
              )}
              {!user && (
                <Link
                  to="/member/login"
                  onClick={closeMobileMenu}
                  className="px-4 py-2 rounded-md hover:bg-accent transition-colors"
                >
                  로그인
                </Link>
              )}
              <Link
                to="/"
                onClick={closeMobileMenu}
                className="px-4 py-2 rounded-md hover:bg-accent transition-colors"
              >
                Home
              </Link>
              <Link
                to="/calen"
                onClick={closeMobileMenu}
                className="px-4 py-2 rounded-md hover:bg-accent transition-colors"
              >
                Calendar
              </Link>
              <Link
                to="/attend"
                onClick={closeMobileMenu}
                className="px-4 py-2 rounded-md hover:bg-accent transition-colors"
              >
                출석부
              </Link>
              <Link
                to="/yerim"
                onClick={closeMobileMenu}
                className="px-4 py-2 rounded-md hover:bg-accent transition-colors"
              >
                Attend
              </Link>
              <Link
                to="/point"
                onClick={closeMobileMenu}
                className="px-4 py-2 rounded-md hover:bg-accent transition-colors"
              >
                Point
              </Link>
              <Link
                to="/member"
                onClick={closeMobileMenu}
                className="px-4 py-2 rounded-md hover:bg-accent transition-colors"
              >
                Member
              </Link>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}

export default Navigation;
