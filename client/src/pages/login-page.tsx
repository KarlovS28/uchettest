import { useState } from "react";
import { Switch, Route, Redirect } from "wouter";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="paper max-w-md w-full p-8 rounded-lg">
        <div className="text-center mb-8">
          <h1 className="font-playfair text-3xl font-bold text-primary-foreground mb-2">ДЕЛА</h1>
          <p className="text-sm text-primary-foreground italic">Система учета имущества</p>
          <div className="vintage-divider my-4"></div>
        </div>
        
        <p>Происходит проверка авторизации...</p>
        
        <Redirect to="/auth" />
      </div>
    </div>
  );
}