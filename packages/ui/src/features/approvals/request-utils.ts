import type { HostUiRequest } from "@fraym/driver";

export function hostUiRequestId(
  request: Pick<HostUiRequest, "id" | "requestId">,
): string {
  return request.requestId ?? request.id;
}
