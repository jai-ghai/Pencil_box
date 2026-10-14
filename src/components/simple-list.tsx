"use client";

import type { HTMLAttributes, Key, ReactNode } from "react";
import { Empty, Skeleton, theme } from "antd";

/**
 * Plain list with Ant Design tokens. Ant Design 6.6 deprecated its own `List`, and its replacement (`Listy`)
 * is a virtualised list that needs fixed heights, which is not what these short lists need.
 */
export function SimpleList<T>({
  dataSource,
  renderItem,
  getKey,
  itemProps,
  bordered = false,
  loading = false,
  header,
  emptyText = "Nothing here",
  className,
}: {
  dataSource: T[];
  renderItem: (item: T, index: number) => ReactNode;
  getKey?: (item: T, index: number) => Key;
  /** extra attributes for each <li> (click handlers, highlight, role) */
  itemProps?: (item: T, index: number) => HTMLAttributes<HTMLLIElement>;
  bordered?: boolean;
  loading?: boolean;
  header?: ReactNode;
  emptyText?: ReactNode;
  className?: string;
}) {
  const { token } = theme.useToken();
  const line = `1px solid ${token.colorBorderSecondary}`;
  return (
    <div className={className} style={bordered ? { border: line, borderRadius: token.borderRadiusLG, overflow: "hidden", background: token.colorBgContainer } : undefined}>
      {header && <div style={{ padding: "10px 16px", borderBottom: line }}>{header}</div>}
      {loading ? (
        <div style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 2 }} /></div>
      ) : dataSource.length === 0 ? (
        <div style={{ padding: 16 }}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} /></div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {dataSource.map((item, i) => {
            const extra = itemProps?.(item, i);
            return (
              <li key={getKey ? getKey(item, i) : i} {...extra} style={{ padding: "12px 16px", borderTop: i > 0 ? line : undefined, ...extra?.style }}>
                {renderItem(item, i)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
