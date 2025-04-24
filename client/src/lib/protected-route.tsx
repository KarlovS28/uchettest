import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  // Временное решение - перенаправляем на /auth для всех защищенных маршрутов
  // пока не решим проблемы с авторизацией
  return (
    <Route path={path}>
      <Redirect to="/auth" />
    </Route>
  );
}
