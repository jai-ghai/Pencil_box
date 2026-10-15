"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Checkbox, Drawer, Flex, Form, Grid, Input, Result, Select, Switch, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { api } from "@/lib/client";
import { ACTION_PERMS, DEFAULT_ADMIN_PERMS, PAGE_PERMS, type Role } from "@/lib/permissions";
import { formatIST } from "@/lib/time";
import { useMe } from "@/lib/use-me";

interface UserRow {
  id: string;
  username: string;
  role: Role;
  permissions: string[];
  active: boolean;
}
interface LogRow {
  id: string;
  at: string;
  by: string;
  action: string;
  summary: string;
}
interface FormValues {
  username: string;
  role: Role;
  password?: string;
  permissions: string[];
}

const ROLE_LABEL: Record<Role, string> = { superadmin: "Super admin", admin: "Admin", cashier: "Cashier" };
const ROLE_HELP: Record<Role, string> = {
  superadmin: "Everything, including users and permissions.",
  admin: "Only the pages and actions you tick below.",
  cashier: "Billing screen only.",
};

/** A readable random password: letters and digits without look-alikes. */
function suggestPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return [...bytes].map((n) => chars[n % chars.length]).join("");
}

export default function UsersPage() {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const me = useMe();
  const [form] = Form.useForm<FormValues>();
  const role = Form.useWatch("role", form) ?? "admin";
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [editing, setEditing] = useState<UserRow | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await api<{ users: UserRow[]; log: LogRow[] }>("/api/admin/users");
    setUsers(d.users);
    setLog(d.log);
  }, []);
  useEffect(() => {
    if (me && me.role !== "superadmin") return;
    api<{ users: UserRow[]; log: LogRow[] }>("/api/admin/users")
      .then((d) => (setUsers(d.users), setLog(d.log)))
      .catch((e: Error) => message.error(e.message));
  }, [me, message]);

  if (me && me.role !== "superadmin") return <Result status="403" title="Only the super admin can manage users" />;

  function startNew() {
    form.resetFields();
    form.setFieldsValue({ role: "admin", permissions: DEFAULT_ADMIN_PERMS, password: suggestPassword() });
    setEditing("new");
  }
  function startEdit(u: UserRow) {
    form.resetFields();
    form.setFieldsValue({ username: u.username, role: u.role, permissions: u.permissions, password: undefined });
    setEditing(u);
  }

  async function save(v: FormValues) {
    setBusy(true);
    try {
      if (editing === "new") {
        await api("/api/admin/users", { body: { username: v.username, role: v.role, password: v.password, permissions: v.role === "admin" ? v.permissions : [] } });
        message.success(`Created "${v.username}". Give them the password now: it is not shown again.`);
      } else if (editing) {
        await api(`/api/admin/users/${editing.id}`, { method: "PATCH", body: { role: v.role, permissions: v.role === "admin" ? v.permissions : [], ...(v.password ? { password: v.password } : {}) } });
        message.success("Saved");
      }
      setEditing(null);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(u: UserRow, active: boolean) {
    try {
      await api(`/api/admin/users/${u.id}`, { method: "PATCH", body: { active } });
      message.success(active ? `${u.username} can sign in again` : `${u.username} is switched off`);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  const pagesText = (u: UserRow) => {
    if (u.role === "superadmin") return "Everything";
    if (u.role === "cashier") return "Billing only";
    const pages = PAGE_PERMS.filter((p) => u.permissions.includes(p.key)).length;
    const actions = ACTION_PERMS.filter((a) => u.permissions.includes(a.key)).map((a) => a.label);
    return `${pages} of ${PAGE_PERMS.length} pages${actions.length ? ` · ${actions.join(", ")}` : ""}`;
  };

  const columns: TableColumnsType<UserRow> = [
    { title: "Username", dataIndex: "username", render: (n: string, u) => <Typography.Text strong>{n}{u.username === me?.username && <Tag style={{ marginInlineStart: 8 }}>you</Tag>}</Typography.Text> },
    { title: "Role", dataIndex: "role", render: (r: Role) => <Tag color={r === "superadmin" ? "gold" : r === "admin" ? "blue" : "default"}>{ROLE_LABEL[r]}</Tag> },
    { title: "Can open", key: "p", responsive: ["md"], render: (_: unknown, u) => <Typography.Text type="secondary">{pagesText(u)}</Typography.Text> },
    { title: "Active", key: "a", width: 90, render: (_: unknown, u) => <Switch checked={u.active} disabled={u.username === me?.username} aria-label={`${u.active ? "Switch off" : "Switch on"} ${u.username}`} onChange={(v) => toggleActive(u, v)} /> },
    { title: "", key: "e", width: 90, render: (_: unknown, u) => <Button onClick={() => startEdit(u)}>Edit</Button> },
  ];

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <Flex justify="space-between" align="center" gap={12} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>Users and permissions</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={startNew}>Add user</Button>
      </Flex>
      <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
        The <b>super admin</b> (you) controls everything. An <b>admin</b> only sees the pages you give them, and can only edit or delete when you allow it. A <b>cashier</b> only sees the billing screen. People are switched off, not deleted, so old bills keep their history.
      </Typography.Paragraph>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<UserRow> rowKey="id" loading={!users} columns={columns} dataSource={users ?? []} pagination={false} />
      </Card>

      <Card title="Activity log" extra={<Button size="small" icon={<ReloadOutlined />} onClick={() => load()}>Refresh</Button>} styles={{ body: { padding: 0 } }}>
        <Table<LogRow>
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
          dataSource={log}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: "Nothing yet. Deleted and edited bills, and changes to users, are listed here." }}
          columns={[
            { title: "When", dataIndex: "at", width: 150, render: (d: string) => formatIST(d) },
            { title: "Who", dataIndex: "by", width: 110 },
            { title: "What", dataIndex: "summary" },
          ]}
        />
      </Card>

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add user" : `Edit ${editing?.username ?? ""}`}
        size={screens.md ? 520 : "100%"}
        extra={<Flex gap={8}><Button onClick={() => setEditing(null)}>Cancel</Button><Button type="primary" loading={busy} onClick={() => form.submit()}>Save</Button></Flex>}
      >
        <Form<FormValues> form={form} layout="vertical" onFinish={save} requiredMark disabled={busy}>
          <Form.Item label="Username" name="username" rules={[{ required: true, message: "Enter a username" }, { pattern: /^[a-z0-9._-]{3,30}$/, message: "3 to 30 lowercase letters, numbers, dot, dash or underscore" }]}>
            <Input disabled={editing !== "new"} autoComplete="off" />
          </Form.Item>
          <Form.Item label="Role" name="role" extra={ROLE_HELP[role]}>
            <Select
              disabled={editing !== "new" && editing?.username === me?.username}
              options={[{ value: "admin", label: "Admin" }, { value: "cashier", label: "Cashier" }, { value: "superadmin", label: "Super admin" }]}
            />
          </Form.Item>
          <Form.Item
            label={editing === "new" ? "Password" : "New password (leave empty to keep the current one)"}
            name="password"
            rules={[{ required: editing === "new", message: "Enter a password" }, { min: 10, message: "Use at least 10 characters" }]}
          >
            <Input.Password autoComplete="new-password" addonAfter={<Button type="link" size="small" onClick={() => form.setFieldValue("password", suggestPassword())}>Suggest</Button>} />
          </Form.Item>
          {editing === "new" && <Alert type="info" showIcon style={{ marginBottom: 16 }} title="Write the password down for them. It is stored scrambled and cannot be shown again." />}

          {role === "admin" && (
            <>
              <Form.Item label="Pages this admin can open" name="permissions" style={{ marginBottom: 8 }}>
                <Checkbox.Group style={{ display: "flex", flexDirection: "column", gap: 6 }} options={PAGE_PERMS.map((p) => ({ value: p.key, label: p.label }))} />
              </Form.Item>
              <Form.Item label="Extra actions this admin may do" name="permissions" style={{ marginBottom: 0 }} extra="Without these, they can look but not change.">
                <Checkbox.Group style={{ display: "flex", flexDirection: "column", gap: 6 }} options={ACTION_PERMS.map((p) => ({ value: p.key, label: p.label }))} />
              </Form.Item>
            </>
          )}
        </Form>
      </Drawer>
    </div>
  );
}
