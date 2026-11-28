/**
 * Writes the storefront Ant Design styles to a real stylesheet.
 * The class hash is the style contents, so a second render must produce the same names.
 */
import { writeFileSync } from "node:fs";
import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";
import { renderToString } from "react-dom/server";
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfigProvider,
  Drawer,
  Empty,
  Flex,
  Input,
  Modal,
  Result,
  Segmented,
  Select,
  Skeleton,
  Slider,
  Space,
  Tag,
  Typography,
} from "antd";
import { MenuOutlined, SearchOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { buildTheme } from "../src/lib/theme";

function Sink() {
  return (
    <App>
      <Flex align="center" gap={4}>
        <Button type="text" aria-label="Open menu" icon={<MenuOutlined />} />
        <Button type="primary" icon={<ShoppingCartOutlined />}>Cart</Button>
        <Button>Filter</Button>
        <Button type="link">View</Button>
        <Badge count={2}><Button type="primary" icon={<ShoppingCartOutlined />} /></Badge>
      </Flex>
      <Segmented options={[{ label: "EN", value: "en" }, { label: "हिं", value: "hi" }]} value="en" />
      <Input size="large" prefix={<SearchOutlined />} placeholder="Search" />
      <Select value="popular" options={[{ value: "popular", label: "Popular" }]} />
      <Checkbox>Brand</Checkbox>
      <Slider range value={[0, 100]} />
      <Card><Typography.Title level={4}>Shelf</Typography.Title><Tag>Offer</Tag></Card>
      <Space><Tag color="success">Yes</Tag><Tag color="warning">Low</Tag></Space>
      <Alert type="info" showIcon title="Note" />
      <Empty description="None" />
      <Skeleton active />
      <Result status="warning" title="Retry" />
      <Drawer open title="Filter"><p>Filters</p></Drawer>
      <Modal open title="Choices"><p>Options</p></Modal>
    </App>
  );
}

function paint() {
  const cache = createCache();
  const html = renderToString(
    <StyleProvider cache={cache} layer>
      <ConfigProvider theme={buildTheme({ dark: false, reduceMotion: false, accent: "sun" })}>
        <Sink />
      </ConfigProvider>
    </StyleProvider>,
  );
  return { html, css: extractStyle(cache, { plain: true }) };
}

const first = paint();
const second = paint();
const className = first.html.match(/class="(css-[^"]+)"/)?.[1] ?? "";
if (!className || !second.html.includes(className) || !first.css.includes(className.split(" ")[0]!)) {
  console.error("Ant Design class hash is not stable:", className);
  process.exit(1);
}
writeFileSync(new URL("../src/styles/antd-store.css", import.meta.url), first.css);
console.log("wrote", first.css.length, "bytes, sample", className.split(" ")[0]);
