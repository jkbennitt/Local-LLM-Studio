
# Frontend UI/UX Replication Prompt - ML Training Platform

**Build the exact frontend interface as described below. This prompt focuses solely on preserving the excellent UI/UX design patterns of the existing ML training platform.**

## Technology Stack (Exact Match)
- **Framework**: React 18 + TypeScript + Vite
- **UI Library**: Shadcn/UI components with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React icon library

## Core Layout Structure

### Header Design
- **Fixed header** with `sticky top-0 z-50` positioning
- **Brand section**: Bot icon + "LocalLLM Studio" title on the left
- **Status indicator**: Green dot + "Offline Ready" text
- **Action button**: Primary colored "Export Model" button with Download icon
- **Background**: Clean white with subtle gray border-bottom

### Main Layout Grid
- **Container**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6`
- **Grid**: `grid grid-cols-1 lg:grid-cols-4 gap-6`
- **Sidebar**: 1 column width on large screens
- **Content**: 3 columns width on large screens

## Sidebar Design Pattern

### Workflow Navigation
- **Card container** with white background and subtle shadow
- **Section header**: "Workflow" with clean typography
- **Navigation buttons** with these exact states:
  - Active: `bg-orange-50 text-[hsl(var(--primary))] hover:bg-orange-50`
  - Inactive: `text-gray-700 hover:bg-gray-50`
- **Button structure**: Icon + text, full width, left-aligned
- **Icons**: Database, Cog, Play, FlaskConical for the 4 main tabs

### Training Status Section
- **Divider**: `mt-8` spacing before status section
- **Header**: "Training Status" with small, semibold text
- **Status items**: Key-value pairs with consistent spacing
- **Progress bar**: Full-width with current training progress
- **Metrics**: Current Model, Progress %, Loss value display

## Main Content Area Design

### Workflow Overview Component
- **Gradient background**: `bg-gradient-to-r from-indigo-50 to-purple-50`
- **Border**: `border border-indigo-200`
- **Icon + header**: Info icon + "ML Workflow Overview" title
- **Description text**: Clear explanation of the 4-step process
- **Step cards grid**: `grid grid-cols-1 md:grid-cols-4 gap-4`

### Step Card Design Pattern
- **Interactive buttons** with hover states and active highlighting
- **Visual structure**: Icon + status icon on top, title/description in center, time badge at bottom
- **Status indicators**: CheckCircle (green), Clock (blue), AlertCircle (gray)
- **Active state**: `border-indigo-300 bg-indigo-100`
- **Arrow connectors**: Between cards on desktop view
- **Tooltips**: Hover information for each step

## Tab Content Design Patterns

### Educational Header Cards
Each tab starts with a distinctive educational header:
- **Dataset**: `bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200`
- **Architecture**: `bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200`
- **Training**: `bg-gradient-to-r from-green-50 to-emerald-50 border-green-200`
- **Testing**: `bg-gradient-to-r from-orange-50 to-red-50 border-orange-200`

### Header Structure
- **Icon + title**: Relevant icon + "Step X: [Action]" format
- **Description**: Clear explanation of what this step accomplishes
- **Educational callout**: Background-colored box with "Why this matters" content

### Form Design Patterns
- **Card containers**: White background with subtle shadows
- **Section headers**: Icon + title + help tooltip pattern
- **Form fields**: React Hook Form + Zod validation
- **Input styling**: `focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))]`
- **Button styling**: Primary color with hover states
- **Tooltips**: HelpCircle icons with detailed explanations

## File Upload Component
- **Drag-and-drop area** with visual feedback
- **Upload states**: Default, dragging, uploading, success, error
- **File type icons**: Table (CSV), Code (JSON), FileText (default)
- **Progress indication**: During upload process
- **File metadata**: Name, size, sample count display

## Interactive Elements

### Status Badges
- **Success**: `bg-[hsl(var(--success))] text-white`
- **Warning**: `bg-[hsl(var(--warning))] text-white`
- **Error**: `bg-[hsl(var(--destructive))] text-white`
- **Default**: `bg-gray-100 text-gray-800`

### Progress Indicators
- **Progress bars**: Full-width with smooth animations
- **Metric cards**: Centered text with value + label format
- **Real-time updates**: Via TanStack Query polling

### Button Variants
- **Primary**: `bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] text-white`
- **Secondary**: `bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))] text-white`
- **Outline**: Standard outline variant with hover states
- **Ghost**: Transparent with hover effects

## Color System (CSS Variables)
```css
:root {
  --primary: [orange/primary color]
  --secondary: [secondary color]
  --success: [green success color]
  --warning: [yellow warning color]
  --destructive: [red error color]
  --light-bg: [light background]
  --text: [text color]
}
```

## Typography Hierarchy
- **Page titles**: `text-xl font-semibold`
- **Section headers**: `text-lg font-semibold` or `text-lg font-medium`
- **Card titles**: `text-lg font-medium`
- **Body text**: Default sizing with appropriate line-height
- **Help text**: `text-sm text-gray-600`
- **Labels**: `text-sm font-medium text-gray-700`

## Responsive Design
- **Mobile-first**: Components adapt gracefully to smaller screens
- **Grid breakpoints**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` patterns
- **Navigation**: Sidebar collapses appropriately on mobile
- **Cards**: Stack vertically on small screens

## Interactive Features
- **Tooltips**: Comprehensive help system with contextual information
- **Loading states**: Proper loading indicators for all async operations
- **Error handling**: User-friendly error messages and states
- **Form validation**: Real-time validation with clear error messages

## Accessibility
- **Proper ARIA labels** and semantic HTML structure
- **Keyboard navigation** support throughout the interface
- **Color contrast** meets accessibility standards
- **Screen reader** friendly content structure

## Animation & Transitions
- **Smooth transitions** for state changes and hover effects
- **Loading animations**: Spinners and skeleton states where appropriate
- **Micro-interactions**: Subtle feedback for user actions

**Build this interface exactly as described, maintaining all design patterns, color schemes, spacing, and interactive behaviors. The UI should feel polished, professional, and educational while remaining highly functional.**
