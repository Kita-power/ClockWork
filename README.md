# ClockWork

A web application built with Next.js and Supabase for authentication and data management.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Auth & Database:** [Supabase](https://supabase.com)
- **Styling:** [Tailwind CSS](https://tailwindcss.com)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com) (New York style)
- **Icons:** [Lucide React](https://lucide.dev)
- **Theming:** [next-themes](https://github.com/pacocoursey/next-themes) (system/light/dark)
- **Language:** TypeScript

## PWA Support

- ClockWork is configured as an installable Progressive Web App (PWA) via an App Router manifest.
- Placeholder app icons are available at `public/icon-192x192.png` and `public/icon-512x512.png`.
- Current scope is installability only: no offline caching/service worker behavior is enabled yet.

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io)
- A [Supabase](https://supabase.com/dashboard) project

### Setup

1. Clone the repository:
  ```bash
   git clone <repo-url>
   cd clockwork
  ```
2. Install dependencies:
  ```bash
   npm install
  ```
3. Create a `.env.local` file from the example:
  ```bash
   cp .env.example .env.local
  ```
4. Fill in your Supabase credentials in `.env.local`:
  ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
  ```
   Both values can be found in your [Supabase project API settings](https://supabase.com/dashboard/project/_?showConnect=true).
5. Start the dev server:
  ```bash
   npm dev
  ```
   Open [http://localhost:3000](http://localhost:3000).

## Demo accounts (development)


| Role          | Login email                                                   | Password           |
| ------------- | ------------------------------------------------------------- | ------------------ |
| Manager       | [manager@clockwork.com](mailto:manager@clockwork.com)         | `DyQE3BuQsQN35dDC` |
| Consultant    | [consultantA@clockwork.com](mailto:consultantA@clockwork.com) | `SeLun6egTy8MApfv` |
| Consultant    | [consultantB@clockwork.com](mailto:consultantB@clockwork.com) | `rboFAbdApR%%xXNp` |
| Consultant    | [consultantc@clockwork.com](mailto:consultantc@clockwork.com) | `wQweye2oQ*Vxm2rf` |
| Finance       | [Finance@clockwork.com](mailto:Finance@clockwork.com)         | `2BiLJPLfBP8FCz!@` |
| Administrator | [bernard@clockwork.com](mailto:bernard@clockwork.com)         | `ucSFAwtodPB6zwFE` |


## Project Structure

```
app/
├── auth/               # Auth routes (login, sign-up, forgot/update password)
├── protected/          # Authenticated-only pages
├── layout.tsx          # Root layout (font, theme provider)
├── page.tsx            # Landing page
└── globals.css         # Global styles & CSS variables
components/
├── ui/                 # shadcn/ui primitives (button, input, card, etc.)
├── auth-button.tsx     # Login/logout toggle
├── login-form.tsx      # Login form
├── sign-up-form.tsx    # Sign-up form
├── theme-switcher.tsx  # Light/dark/system toggle
└── ...
lib/
├── supabase/
│   ├── client.ts       # Browser Supabase client
│   ├── server.ts       # Server Supabase client
│   └── proxy.ts        # Middleware session refresh
└── utils.ts            # Shared utilities
```

## Scripts


| Command      | Description              |
| ------------ | ------------------------ |
| `pnpm dev`   | Start development server |
| `pnpm build` | Production build         |
| `pnpm start` | Start production server  |
| `pnpm lint`  | Run ESLint               |


