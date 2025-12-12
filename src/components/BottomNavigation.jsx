import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  MdHome,
  MdCalendarToday,
  MdAssignment,
  MdCelebration,
  MdPeople,
  MdMusicNote,
  MdSchool,
} from "react-icons/md";
import supabase from "../utils/supabase";

const STORAGE_KEY = "selectedMinistries";
const ACTIVE_MINISTRY_KEY = "activeMinistry";

function BottomNavigation() {
  const location = useLocation();
  const [selectedMinistries, setSelectedMinistries] = useState([]);
  const [activeMinistry, setActiveMinistry] = useState(null);

  // 로컬스토리지에서 선택된 ministry 확인
  useEffect(() => {
    const checkSelectedMinistries = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const selectedIds = Array.isArray(parsed) ? parsed : [];

          if (selectedIds.length > 0) {
            // 선택된 ID들로 ministry 정보 가져오기
            const { data, error } = await supabase
              .from("ministry")
              .select("id, name")
              .in("id", selectedIds)
              .order("name");

            if (!error && data) {
              setSelectedMinistries(data);
            } else {
              setSelectedMinistries([]);
            }
          } else {
            setSelectedMinistries([]);
          }
        } else {
          setSelectedMinistries([]);
        }
      } catch (err) {
        console.error("로컬스토리지 읽기 오류:", err);
        setSelectedMinistries([]);
      }
    };

    checkSelectedMinistries();

    // 로컬스토리지 변경 감지
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        checkSelectedMinistries();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // 주기적으로 확인 (같은 탭에서의 변경 감지)
    const interval = setInterval(() => {
      checkSelectedMinistries();
    }, 500);

    // 활성화된 ministry 확인
    const checkActiveMinistry = async () => {
      try {
        const activeMinistryId = localStorage.getItem(ACTIVE_MINISTRY_KEY);
        if (activeMinistryId) {
          const { data, error } = await supabase
            .from("ministry")
            .select("id, name")
            .eq("id", parseInt(activeMinistryId))
            .single();

          if (!error && data) {
            setActiveMinistry(data);
          } else {
            setActiveMinistry(null);
          }
        } else {
          setActiveMinistry(null);
        }
      } catch (err) {
        console.error("활성화된 ministry 확인 오류:", err);
        setActiveMinistry(null);
      }
    };

    checkActiveMinistry();

    // 활성화된 ministry 변경 감지
    const handleActiveMinistryChange = () => {
      checkActiveMinistry();
    };

    window.addEventListener(
      "activeMinistryChanged",
      handleActiveMinistryChange
    );
    window.addEventListener("storage", (e) => {
      if (e.key === ACTIVE_MINISTRY_KEY) {
        checkActiveMinistry();
      }
    });

    const activeInterval = setInterval(() => {
      checkActiveMinistry();
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "activeMinistryChanged",
        handleActiveMinistryChange
      );
      clearInterval(interval);
      clearInterval(activeInterval);
    };
  }, []);

  // 활성화된 ministry에 따라 동적으로 메뉴 생성
  const navItems = useMemo(() => {
    const items = [
      {
        path: "/",
        label: "Home",
        icon: MdHome,
      },
    ];

    // 활성화된 ministry가 있으면 해당 ministry 메뉴 표시
    if (activeMinistry) {
      // ministry 이름에 따라 아이콘과 경로 결정
      let icon = MdMusicNote;
      let path = `/yerim?code=${encodeURIComponent(activeMinistry.name)}`;

      if (activeMinistry.name === "시온성가대") {
        icon = MdMusicNote;
      } else if (activeMinistry.name === "중고등부") {
        icon = MdSchool;
      } else if (activeMinistry.name === "예루살렘성가대") {
        icon = MdMusicNote;
      }

      items.push({
        path,
        label:
          activeMinistry.name.length > 6
            ? activeMinistry.name.substring(0, 6)
            : activeMinistry.name,
        icon,
      });

      // 남은 공간에 기본 메뉴 추가
      const remainingSlots = 5 - items.length;
      if (remainingSlots > 0) {
        const defaultMenus = [
          {
            path: `/calen?code=${encodeURIComponent(activeMinistry.name)}`,
            label: "Calendar",
            icon: MdCalendarToday,
          },
          {
            path: "/attend",
            label: "출석부",
            icon: MdAssignment,
          },
        ];

        items.push(...defaultMenus.slice(0, remainingSlots));
      }
    } else {
      // 활성화된 ministry가 없으면 선택된 ministry들을 표시 (최대 3개)
      const ministryItems = selectedMinistries.slice(0, 3).map((ministry) => {
        let icon = MdMusicNote;
        let path = `/yerim?code=${encodeURIComponent(ministry.name)}`;

        if (ministry.name === "시온성가대") {
          icon = MdMusicNote;
        } else if (ministry.name === "중고등부") {
          icon = MdSchool;
        } else if (ministry.name === "예루살렘성가대") {
          icon = MdMusicNote;
        }

        return {
          path,
          label:
            ministry.name.length > 6
              ? ministry.name.substring(0, 6)
              : ministry.name,
          icon,
        };
      });

      items.push(...ministryItems);

      // 남은 공간에 기본 메뉴 추가
      const remainingSlots = 5 - items.length;
      if (remainingSlots > 0) {
        const defaultMenus = [
          {
            path: "/calen",
            label: "Calendar",
            icon: MdCalendarToday,
          },
          {
            path: "/attend",
            label: "출석부",
            icon: MdAssignment,
          },
        ];

        items.push(...defaultMenus.slice(0, remainingSlots));
      }
    }

    // 선택된 ministry가 없으면 기본 메뉴 표시
    if (selectedMinistries.length === 0 && !activeMinistry) {
      return [
        {
          path: "/",
          label: "Home",
          icon: MdHome,
        },
        {
          path: "/calen",
          label: "Calendar",
          icon: MdCalendarToday,
        },
        {
          path: "/attend",
          label: "출석부",
          icon: MdAssignment,
        },
        {
          path: "/yerim",
          label: "Attend",
          icon: MdCelebration,
        },
        {
          path: "/member",
          label: "Member",
          icon: MdPeople,
        },
      ];
    }

    return items;
  }, [selectedMinistries, activeMinistry]);

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    // 쿼리 파라미터가 있는 경우 처리
    const pathWithoutQuery = path.split("?")[0];
    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(path.split("?")[1] || "");
    const currentSearchParams = new URLSearchParams(location.search);

    // 경로가 일치하는지 확인
    if (!currentPath.startsWith(pathWithoutQuery)) {
      return false;
    }

    // 쿼리 파라미터가 있으면 확인
    if (searchParams.toString()) {
      for (const [key, value] of searchParams.entries()) {
        if (currentSearchParams.get(key) !== value) {
          return false;
        }
      }
    }

    return true;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50">
      <div className="max-w-lg mx-auto flex justify-between items-center px-6 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-2 rounded-lg text-sm transition-colors focus:outline-none ${
                active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-primary hover:bg-accent"
              }`}
            >
              <Icon className="text-2xl mb-1" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNavigation;
