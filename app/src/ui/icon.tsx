// Thin name→lucide mapping so screen code can stay close to the demo (`<Icon name=".." />`).
import {
  Layers, Cpu, Users, Image, Wallet, ShieldCheck, History, Settings, Coins, Film,
  Clock, Mic, Eye, Plus, Check, X, Search, Bell, Sun, Moon, Menu as MenuIcon,
  ChevronDown, ChevronRight, MoreVertical, MoreHorizontal, LogOut, Sparkles,
  Download, RotateCcw, RefreshCw, Copy, Trash2, Folder, FileText, Table, LayoutGrid,
  Trello, List, Play, Wand2, ArrowRight, Mail, Lock, Link, Filter, Info, Pencil,
  Github, Clapperboard, Type, Zap, ClipboardPaste, FileDown, Images, TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  layers: Layers, cpu: Cpu, users: Users, image: Image, wallet: Wallet, shield: ShieldCheck,
  history: History, settings: Settings, coins: Coins, film: Film, clock: Clock, mic: Mic,
  eye: Eye, plus: Plus, check: Check, x: X, search: Search, bell: Bell, sun: Sun, moon: Moon,
  menu: MenuIcon, chevDown: ChevronDown, chevRight: ChevronRight, moreV: MoreVertical,
  more: MoreHorizontal, logout: LogOut, sparkle: Sparkles, download: Download, retry: RotateCcw,
  refresh: RefreshCw, copy: Copy, trash: Trash2, folder: Folder, doc: FileText, table: Table,
  grid: LayoutGrid, kanban: Trello, list: List, play: Play, wand: Wand2, arrowRight: ArrowRight,
  mail: Mail, lock: Lock, link: Link, filter: Filter, info: Info, edit: Pencil, github: Github,
  clapper: Clapperboard, type: Type, bolt: Zap, paste: ClipboardPaste, import: FileDown,
  gallery: Images, warn: TriangleAlert,
};

export function Icon({ name, size = 16, className, strokeWidth }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const C = MAP[name] || Sparkles;
  return <C size={size} className={className} strokeWidth={strokeWidth} />;
}
