import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function NotFound() {
  return (
    <div className="p-6 min-h-screen flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">
            404 - 페이지를 찾을 수 없습니다
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            요청하신 페이지를 찾을 수 없습니다.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              to="/"
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-center hover:bg-primary/90 transition-colors"
            >
              홈으로 돌아가기
            </Link>
            <Link
              to="/zion/list"
              className="w-full px-4 py-2 border rounded-lg text-center hover:bg-accent transition-colors"
            >
              멤버 리스트
            </Link>
            <Link
              to="/calen/calendar"
              className="w-full px-4 py-2 border rounded-lg text-center hover:bg-accent transition-colors"
            >
              달력 보기
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default NotFound;

