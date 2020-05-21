import axios, { AxiosInstance } from 'axios';
import config from '../bitcoin/Config';
const { RELAY, SIGNING_SERVER, REQUEST_TIMEOUT } = config;
//const PROXY_URL = 'https://cors-anywhere.herokuapp.com/'
const URL = 'GETBITTR_URL';

const api = axios.create({
    baseURL: URL,
});


export const BH_AXIOS = axios.create({
    baseURL: RELAY,
    timeout: REQUEST_TIMEOUT,
})



export const SIGNING_AXIOS: AxiosInstance = axios.create({
    baseURL: SIGNING_SERVER,
    timeout: REQUEST_TIMEOUT,
});

export const createService = (data) =>
    api.post('/customer', data);

export const sendEmailService = (data) =>
    api.post('/verify/email', data);

export const emailService = (data) =>
    api.post('/verify/email/check', data);

export const verifyEmailService = (data) =>
    api.post('/verify/email/check', data);

export const smsService = (data) =>
    api.post('/verify/sms', data);

export const xpubService = (data) =>
    api.post('/xpub/check', data);


export function setApiHeaders({ appVersion, appBuildNumber }) {
    axios.defaults.headers.common.appVersion = appVersion;
    axios.defaults.headers.common.appBuildNumber = appBuildNumber;
    BH_AXIOS.defaults.headers.common.appVersion = appVersion;
    BH_AXIOS.defaults.headers.common.appBuildNumber = appBuildNumber;
}

