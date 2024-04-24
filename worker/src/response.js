class JsResponse extends Response {
  constructor(body, opt) {
    const options = {
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH",
        "Cache-Control": opt?.cache
      }
    };
    super(body, options);
  }
}

export default JsResponse;