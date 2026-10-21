import { WorkspaceShell } from '@/components/layout/WorkspaceShell';

export default function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
