import DrawerDropzone from './DrawerDropzone';
import Content from '../Content';

export default function PageLayout() {
  return (
    <div style={{ maxHeight: 'calc(100vh - 67px)', display: 'flex', overflow: 'hidden' }}>
      <DrawerDropzone />
      <Content />
    </div>
  );
}
