import test from "node:test"; import assert from "node:assert/strict"; import {getRequestId,withRequestId} from "../src/lib/request-context";
test("request id generated",()=>assert.match(getRequestId(new Request("http://localhost")),/^[0-9a-f-]{36}$/));
test("safe id preserved",()=>assert.equal(getRequestId(new Request("http://localhost",{headers:{"x-request-id":"phase14-test-123"}})),"phase14-test-123"));
test("unsafe id replaced",()=>assert.notEqual(getRequestId(new Request("http://localhost",{headers:{"x-request-id":"<script>"}})),"<script>"));
test("response id attached",()=>assert.equal(withRequestId({"Cache-Control":"no-store"},"abc-12345678").get("x-request-id"),"abc-12345678"));
