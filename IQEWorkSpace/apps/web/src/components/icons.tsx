/**
 * App-wide icon set: Phosphor icons exposed under the Lucide names the pages
 * already use, so switching styles is a single-file change.
 *
 * - Glyph/control icons (arrows, chevrons, close, plus...) use the "bold" weight
 *   so they stay crisp at 12-16px.
 * - Object/concept icons use "duotone" for a softer, two-tone look that picks
 *   up the surrounding text colour.
 */
import type { ComponentType, SVGProps } from "react";
import type { IconProps as PhosphorProps, IconWeight } from "@phosphor-icons/react";
import {
  ArrowDownLeft as PhArrowDownLeft,
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  ArrowSquareOut as PhArrowSquareOut,
  ArrowUp as PhArrowUp,
  ArrowUpRight as PhArrowUpRight,
  ArrowsClockwise as PhArrowsClockwise,
  Bank as PhBank,
  BookOpen as PhBookOpen,
  Briefcase as PhBriefcase,
  BuildingOffice as PhBuildingOffice,
  Buildings as PhBuildings,
  Calculator as PhCalculator,
  Calendar as PhCalendar,
  CalendarCheck as PhCalendarCheck,
  Camera as PhCamera,
  CaretDown as PhCaretDown,
  CaretLeft as PhCaretLeft,
  CaretRight as PhCaretRight,
  ChartBar as PhChartBar,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  CheckSquare as PhCheckSquare,
  CircleNotch as PhCircleNotch,
  ClipboardText as PhClipboardText,
  Clock as PhClock,
  ClockCounterClockwise as PhClockCounterClockwise,
  Coins as PhCoins,
  Columns as PhColumns,
  Compass as PhCompass,
  Copy as PhCopy,
  Cpu as PhCpu,
  CreditCard as PhCreditCard,
  Cube as PhCube,
  CurrencyInr as PhCurrencyInr,
  DotsThreeVertical as PhDotsThreeVertical,
  DownloadSimple as PhDownloadSimple,
  EnvelopeSimple as PhEnvelopeSimple,
  Eye as PhEye,
  EyeSlash as PhEyeSlash,
  Factory as PhFactory,
  FileCode as PhFileCode,
  FilePlus as PhFilePlus,
  FileText as PhFileText,
  FileXls as PhFileXls,
  Files as PhFiles,
  Fire as PhFire,
  Flag as PhFlag,
  FloppyDisk as PhFloppyDisk,
  Funnel as PhFunnel,
  Gauge as PhGauge,
  GearSix as PhGearSix,
  GitCommit as PhGitCommit,
  Globe as PhGlobe,
  GridFour as PhGridFour,
  Handshake as PhHandshake,
  HardHat as PhHardHat,
  Hash as PhHash,
  Info as PhInfo,
  Lightning as PhLightning,
  List as PhList,
  ListChecks as PhListChecks,
  ListDashes as PhListDashes,
  LockSimple as PhLockSimple,
  LockSimpleOpen as PhLockSimpleOpen,
  MagnifyingGlass as PhMagnifyingGlass,
  MagnifyingGlassMinus as PhMagnifyingGlassMinus,
  MapPin as PhMapPin,
  Medal as PhMedal,
  Moon as PhMoon,
  NotePencil as PhNotePencil,
  Package as PhPackage,
  Palette as PhPalette,
  PaperPlaneTilt as PhPaperPlaneTilt,
  Paperclip as PhPaperclip,
  Pause as PhPause,
  PencilSimple as PhPencilSimple,
  Percent as PhPercent,
  Phone as PhPhone,
  PhoneCall as PhPhoneCall,
  Pill as PhPill,
  Play as PhPlay,
  Plus as PhPlus,
  Power as PhPower,
  Printer as PhPrinter,
  Pulse as PhPulse,
  Question as PhQuestion,
  Receipt as PhReceipt,
  Repeat as PhRepeat,
  Robot as PhRobot,
  Rows as PhRows,
  Ruler as PhRuler,
  Scales as PhScales,
  SealWarning as PhSealWarning,
  Shield as PhShield,
  ShieldCheck as PhShieldCheck,
  ShieldWarning as PhShieldWarning,
  ShoppingBag as PhShoppingBag,
  SidebarSimple as PhSidebarSimple,
  SignOut as PhSignOut,
  Signature as PhSignature,
  Sliders as PhSliders,
  SlidersHorizontal as PhSlidersHorizontal,
  Sparkle as PhSparkle,
  SquaresFour as PhSquaresFour,
  Stack as PhStack,
  StackSimple as PhStackSimple,
  Star as PhStar,
  Sun as PhSun,
  Table as PhTable,
  Tag as PhTag,
  Trash as PhTrash,
  TrendDown as PhTrendDown,
  TrendUp as PhTrendUp,
  Truck as PhTruck,
  UploadSimple as PhUploadSimple,
  User as PhUser,
  UserCheck as PhUserCheck,
  UserMinus as PhUserMinus,
  Users as PhUsers,
  Warning as PhWarning,
  WarningCircle as PhWarningCircle,
  WarningOctagon as PhWarningOctagon,
  Wrench as PhWrench,
  X as PhX,
  XCircle as PhXCircle,
} from "@phosphor-icons/react/dist/ssr";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  /** Accepted for Lucide compatibility; Phosphor weights control stroke instead. */
  strokeWidth?: number | string;
  weight?: IconWeight;
  size?: number | string;
};
export type Icon = ComponentType<IconProps>;

function make(Ph: ComponentType<PhosphorProps>, defaultWeight: IconWeight, name: string): Icon {
  const Wrapped = ({ strokeWidth: _strokeWidth, weight = defaultWeight, ...rest }: IconProps) => (
    <Ph weight={weight} aria-hidden={rest["aria-label"] ? undefined : true} {...(rest as PhosphorProps)} />
  );
  Wrapped.displayName = name;
  return Wrapped;
}

export const Activity = make(PhPulse, "duotone", "Activity");
export const AlertCircle = make(PhWarningCircle, "duotone", "AlertCircle");
export const AlertOctagon = make(PhWarningOctagon, "duotone", "AlertOctagon");
export const AlertTriangle = make(PhWarning, "duotone", "AlertTriangle");
export const ArrowDownLeft = make(PhArrowDownLeft, "bold", "ArrowDownLeft");
export const ArrowLeft = make(PhArrowLeft, "bold", "ArrowLeft");
export const ArrowRight = make(PhArrowRight, "bold", "ArrowRight");
export const ArrowUp = make(PhArrowUp, "bold", "ArrowUp");
export const ArrowUpRight = make(PhArrowUpRight, "bold", "ArrowUpRight");
export const Award = make(PhMedal, "duotone", "Award");
export const BadgeAlert = make(PhSealWarning, "duotone", "BadgeAlert");
export const BarChart3 = make(PhChartBar, "duotone", "BarChart3");
export const BookOpen = make(PhBookOpen, "duotone", "BookOpen");
export const Bot = make(PhRobot, "duotone", "Bot");
export const Box = make(PhCube, "duotone", "Box");
export const Boxes = make(PhPackage, "duotone", "Boxes");
export const Briefcase = make(PhBriefcase, "duotone", "Briefcase");
export const Building = make(PhBuildings, "duotone", "Building");
export const Building2 = make(PhBuildingOffice, "duotone", "Building2");
export const Calculator = make(PhCalculator, "duotone", "Calculator");
export const Calendar = make(PhCalendar, "duotone", "Calendar");
export const CalendarCheck = make(PhCalendarCheck, "duotone", "CalendarCheck");
export const Camera = make(PhCamera, "duotone", "Camera");
export const Check = make(PhCheck, "bold", "Check");
export const CheckCircle = make(PhCheckCircle, "duotone", "CheckCircle");
export const CheckCircle2 = make(PhCheckCircle, "duotone", "CheckCircle2");
export const CheckSquare = make(PhCheckSquare, "duotone", "CheckSquare");
export const ChevronDown = make(PhCaretDown, "bold", "ChevronDown");
export const ChevronLeft = make(PhCaretLeft, "bold", "ChevronLeft");
export const ChevronRight = make(PhCaretRight, "bold", "ChevronRight");
export const ClipboardCheck = make(PhClipboardText, "duotone", "ClipboardCheck");
export const ClipboardList = make(PhListChecks, "duotone", "ClipboardList");
export const Clock = make(PhClock, "duotone", "Clock");
export const Coins = make(PhCoins, "duotone", "Coins");
export const Columns = make(PhColumns, "duotone", "Columns");
export const Compass = make(PhCompass, "duotone", "Compass");
export const Copy = make(PhCopy, "bold", "Copy");
export const Cpu = make(PhCpu, "duotone", "Cpu");
export const CreditCard = make(PhCreditCard, "duotone", "CreditCard");
export const DollarSign = make(PhCurrencyInr, "duotone", "DollarSign");
export const Download = make(PhDownloadSimple, "bold", "Download");
export const Edit3 = make(PhPencilSimple, "bold", "Edit3");
export const ExternalLink = make(PhArrowSquareOut, "bold", "ExternalLink");
export const Eye = make(PhEye, "bold", "Eye");
export const EyeOff = make(PhEyeSlash, "bold", "EyeOff");
export const Factory = make(PhFactory, "duotone", "Factory");
export const FileCheck = make(PhFileText, "duotone", "FileCheck");
export const FileCheck2 = make(PhFiles, "duotone", "FileCheck2");
export const FileCode = make(PhFileCode, "duotone", "FileCode");
export const FileEdit = make(PhNotePencil, "duotone", "FileEdit");
export const FilePlus = make(PhFilePlus, "duotone", "FilePlus");
export const FileSignature = make(PhSignature, "duotone", "FileSignature");
export const FileSpreadsheet = make(PhFileXls, "duotone", "FileSpreadsheet");
export const FileText = make(PhFileText, "duotone", "FileText");
export const Filter = make(PhFunnel, "bold", "Filter");
export const Flag = make(PhFlag, "duotone", "Flag");
export const Flame = make(PhFire, "duotone", "Flame");
export const Gauge = make(PhGauge, "duotone", "Gauge");
export const GitCommit = make(PhGitCommit, "duotone", "GitCommit");
export const Globe = make(PhGlobe, "duotone", "Globe");
export const Handshake = make(PhHandshake, "duotone", "Handshake");
export const HardHat = make(PhHardHat, "duotone", "HardHat");
export const Hash = make(PhHash, "bold", "Hash");
export const HelpCircle = make(PhQuestion, "duotone", "HelpCircle");
export const History = make(PhClockCounterClockwise, "duotone", "History");
export const Info = make(PhInfo, "duotone", "Info");
export const Landmark = make(PhBank, "duotone", "Landmark");
export const Layers = make(PhStack, "duotone", "Layers");
export const Layers3 = make(PhStackSimple, "duotone", "Layers3");
export const LayoutDashboard = make(PhSquaresFour, "duotone", "LayoutDashboard");
export const LayoutGrid = make(PhGridFour, "duotone", "LayoutGrid");
export const LayoutList = make(PhListDashes, "duotone", "LayoutList");
export const ListChecks = make(PhListChecks, "duotone", "ListChecks");
export const Loader2 = make(PhCircleNotch, "bold", "Loader2");
export const Lock = make(PhLockSimple, "bold", "Lock");
export const LogOut = make(PhSignOut, "bold", "LogOut");
export const Mail = make(PhEnvelopeSimple, "duotone", "Mail");
export const MapPin = make(PhMapPin, "duotone", "MapPin");
export const Menu = make(PhList, "bold", "Menu");
export const Moon = make(PhMoon, "duotone", "Moon");
export const MoreVertical = make(PhDotsThreeVertical, "bold", "MoreVertical");
export const PackageCheck = make(PhPackage, "duotone", "PackageCheck");
export const Palette = make(PhPalette, "duotone", "Palette");
export const PanelLeft = make(PhSidebarSimple, "duotone", "PanelLeft");
export const PanelLeftClose = make(PhSidebarSimple, "duotone", "PanelLeftClose");
export const Paperclip = make(PhPaperclip, "duotone", "Paperclip");
export const Pause = make(PhPause, "bold", "Pause");
export const Percent = make(PhPercent, "bold", "Percent");
export const Phone = make(PhPhone, "duotone", "Phone");
export const PhoneCall = make(PhPhoneCall, "duotone", "PhoneCall");
export const Pill = make(PhPill, "duotone", "Pill");
export const Play = make(PhPlay, "bold", "Play");
export const Plus = make(PhPlus, "bold", "Plus");
export const Power = make(PhPower, "duotone", "Power");
export const Printer = make(PhPrinter, "duotone", "Printer");
export const Receipt = make(PhReceipt, "duotone", "Receipt");
export const RefreshCw = make(PhArrowsClockwise, "bold", "RefreshCw");
export const Repeat = make(PhRepeat, "bold", "Repeat");
export const Rows = make(PhRows, "duotone", "Rows");
export const Ruler = make(PhRuler, "duotone", "Ruler");
export const Save = make(PhFloppyDisk, "duotone", "Save");
export const Scale = make(PhScales, "duotone", "Scale");
export const Search = make(PhMagnifyingGlass, "bold", "Search");
export const SearchX = make(PhMagnifyingGlassMinus, "bold", "SearchX");
export const Send = make(PhPaperPlaneTilt, "bold", "Send");
export const Settings = make(PhGearSix, "duotone", "Settings");
export const Shield = make(PhShield, "duotone", "Shield");
export const ShieldAlert = make(PhShieldWarning, "duotone", "ShieldAlert");
export const ShieldCheck = make(PhShieldCheck, "duotone", "ShieldCheck");
export const ShoppingBag = make(PhShoppingBag, "duotone", "ShoppingBag");
export const Signature = make(PhSignature, "duotone", "Signature");
export const Sliders = make(PhSliders, "duotone", "Sliders");
export const SlidersHorizontal = make(PhSlidersHorizontal, "duotone", "SlidersHorizontal");
export const Sparkles = make(PhSparkle, "duotone", "Sparkles");
export const Star = make(PhStar, "duotone", "Star");
export const Sun = make(PhSun, "duotone", "Sun");
export const Table = make(PhTable, "duotone", "Table");
export const Tag = make(PhTag, "duotone", "Tag");
export const Trash2 = make(PhTrash, "bold", "Trash2");
export const TrendingDown = make(PhTrendDown, "duotone", "TrendingDown");
export const TrendingUp = make(PhTrendUp, "duotone", "TrendingUp");
export const Truck = make(PhTruck, "duotone", "Truck");
export const Unlock = make(PhLockSimpleOpen, "bold", "Unlock");
export const Upload = make(PhUploadSimple, "bold", "Upload");
export const User = make(PhUser, "duotone", "User");
export const UserCheck = make(PhUserCheck, "duotone", "UserCheck");
export const UserX = make(PhUserMinus, "duotone", "UserX");
export const Users = make(PhUsers, "duotone", "Users");
export const Wrench = make(PhWrench, "duotone", "Wrench");
export const X = make(PhX, "bold", "X");
export const XCircle = make(PhXCircle, "duotone", "XCircle");
export const Zap = make(PhLightning, "duotone", "Zap");
