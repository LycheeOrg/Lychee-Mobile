/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { reactive } from "vue";

/** UI-005-02: whether the upload sheet is open; one sheet for the whole app. */
export const uploadSheet = reactive({ open: false });
