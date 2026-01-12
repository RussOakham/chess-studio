// Standardized API response utilities

import { NextResponse } from "next/server";

// oxlint-disable-next-line id-length
function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export { successResponse, errorResponse };
