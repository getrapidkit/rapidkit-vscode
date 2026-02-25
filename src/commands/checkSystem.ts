/**
 * System check command - delegated to doctor to avoid command drift.
 */

import { doctorCommand } from './doctor';

export async function checkSystemCommand() {
  return doctorCommand();
}
