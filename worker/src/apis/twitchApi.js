import { ofetch } from "ofetch";

class twitchApi {
  constructor (TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET) {
    this.TWITCH_CLIENT_ID = TWITCH_CLIENT_ID;
    this.TWITCH_CLIENT_SECRET = TWITCH_CLIENT_SECRET;
    this.GRANT_TYPE = "client_credentials";
    this.API_BASE = "https://api.twitch.tv/helix";
    this.OAUTH_BASE = "https://id.twitch.tv/oauth2";
  }

  async getAccessToken () {
    const oauth_url = `${this.OAUTH_BASE}/token?client_id=${this.TWITCH_CLIENT_ID}&client_secret=${this.TWITCH_CLIENT_SECRET}&grant_type=${this.GRANT_TYPE}`;
    const data = await ofetch(oauth_url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    }).catch(() => null);
    return data?.access_token;
  }

  async getUserByName (name) {
    const access_token = await this.getAccessToken();
    const api = `${this.API_BASE}/users?login=${name.toLowerCase()}`;
    const headers = {
      "Client-ID": this.TWITCH_CLIENT_ID,
      "Authorization": "Bearer " + access_token
    };

    if (!access_token) return null;

    const data = await ofetch(api, { headers }).catch(() => null);
    return data?.data[0];
  }

  async getUsersById (array) {
    const access_token = await this.getAccessToken();
    const arrayString = array.filter((str, index) => array.indexOf(str) === index).map(id => `id=${id}`).join("&");
    const api = `${this.API_BASE}/users?${arrayString}`;
    const headers = {
      "Client-ID": this.TWITCH_CLIENT_ID,
      "Authorization": "Bearer " + access_token
    };

    if (!access_token) return null;

    const data = await ofetch(api, { headers }).catch(() => null);
    return data?.data;
  }

  async getStreamsById (array) {
    const access_token = await this.getAccessToken();
    const arrayString = array.filter((str, index) => array.indexOf(str) === index).map(id => `user_id=${id}`).join("&");
    const api = `${this.API_BASE}/streams?${arrayString}`;
    const headers = {
      "Client-ID": this.TWITCH_CLIENT_ID,
      "Authorization": "Bearer " + access_token
    };

    if (!access_token) return null;

    const data = await ofetch(api, { headers }).catch(() => null);
    return data?.data;
  }
}

export default twitchApi;
