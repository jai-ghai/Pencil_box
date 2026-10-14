"use client";

import { useState } from "react";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Wordmark } from "@/components/wordmark";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(values: { username: string; password: string }) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not sign in");
      setBusy(false);
      return;
    }
    // only follow same-site relative paths, never an arbitrary URL
    const next = new URLSearchParams(window.location.search).get("next") ?? "";
    window.location.href = next.startsWith("/") && !next.startsWith("//") ? next : data.role === "owner" ? "/admin" : "/pos";
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="px-4 py-5" style={{ background: "var(--pb-navy)" }}>
        <div className="mx-auto max-w-md">
          <Wordmark />
        </div>
      </div>
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <Card>
          <Typography.Title level={3} style={{ marginTop: 0 }}>
            Staff sign in
          </Typography.Title>
          <Form layout="vertical" onFinish={submit} requiredMark={false} disabled={busy}>
            <Form.Item label="Username" name="username" rules={[{ required: true, message: "Enter your username" }]}>
              <Input size="large" prefix={<UserOutlined />} autoFocus autoComplete="username" />
            </Form.Item>
            <Form.Item label="Password" name="password" rules={[{ required: true, message: "Enter your password" }]}>
              <Input.Password size="large" prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>
            {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
            <Button type="primary" htmlType="submit" size="large" block loading={busy}>
              Sign in
            </Button>
          </Form>
        </Card>
      </div>
    </main>
  );
}
