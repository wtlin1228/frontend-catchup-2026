---
title: A checklist for progressively enhanced forms
description: What a form should do before scripts run, and what scripts are allowed to add.
date: 2026-05-20
tags: [forms, progressive-enhancement]
---

## Before any script runs

- The form has an `action` and a `method`, and the server accepts a plain form-encoded POST.
- Every field has a label, and required fields are marked with `required`.
- Native constraints cover the easy cases: `type="email"`, `minlength`, `pattern`.
- The server validates everything again and renders the result as a page.

## What script may add

- Inline messages using the Constraint Validation API, in your own words.
- Submission with `fetch` to the same URL, with a pending state on the button.
- Server-side errors mapped back onto the fields that caused them.
- Drafts kept in session storage so a failed request loses nothing.
- Upload progress for files, which needs `XMLHttpRequest`.

## What script must not do

- Replace native validation with a library that disables it.
- Submit to a different endpoint than the plain form would.
- Lose the user's input on an error.

## How frameworks package this

React Router's `Form`, SvelteKit's `use:enhance`, Next.js server actions with `useActionState`, Astro Actions and Angular's Signal Forms all start from a working HTML form and add the items above. The question for the survey is how much of the checklist each one gives you for free, and whether it stops you from doing the rest.
