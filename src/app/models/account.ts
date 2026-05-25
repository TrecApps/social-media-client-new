

export type AuthMethodType = "PASSWORD" | "EMAIL" | "PHONE" | "AUTH_APP";


export interface AuthRecordPublic {
    type: AuthMethodType;
    name: string;
}

export interface PhoneNumber {
    countryCode: number;
    number: number;
    verified: boolean;
    code?: string;
    time: Date;
}

export interface UserEmail {
    email: string;
    verified: boolean;

    code?: string;
    time: Date;
}

export interface AuthMethod {
    index: number;
    type: AuthMethodType;
    established:Date;
    updated: Date;
    name: string;
    code: string;
    codeExpiration?: Date;
}

export interface Session {
    deviceId: string;
    deviceInfo: string;
    expiration: Date | undefined;
}


export interface StyleSpec {
    style: string;
    useDark: boolean;
}

export interface UserAccount {
    id: string;
    accountId: string;
    ownedAccounts?: string[];
    administrativeAccounts?: string[];
    
    displayName: string;
    username: string;
    
    primaryNumber?: PhoneNumber;
    
    secondaryNumber?: PhoneNumber;
    
    primaryEmail?: UserEmail;
    
    secondaryEmail?: UserEmail;
    
    emails?: UserEmail[];
    
    authMethods: AuthMethod[];
    sessionSet: Session[];

    extensions: any;
}



export type AccountType = "USER" | "BRAND" | "APP";

export interface Account {
    id: string;
    type: AccountType;

    displayName: string;
    accountHandle: String;
    creator: string;
    organizationId?: string;
    owners: string[];
    admins: string[];
}

export interface AccountList {
    mainUserAccount: UserAccount;
    mainAccount: Account;
    activeAccount: Account | undefined;
    brandAccounts: Account[];
    session: Session;
    authMethods: AuthMethod[];
    persist: boolean;
}

export interface AuthAttempt{
    name: string;
    code: string;
}

export interface LoginRequest {
    stayLoggedIn: boolean;
    credentials: AuthAttempt[];
    username: string;
}

export interface UserPost {
    username: string;
    displayName: string;

    password: string;

    
    mobilePhone: number;
    
    mobilePhone2: number | undefined;

    
    birthday: Date;

    primaryMail: string;

    secondaryEmail: string | undefined;
}


export interface MfaRegistration{
    qrCode: string;
    userCode: string;
    name: string;
}

export type MfaRegistrationHandler = (value: MfaRegistration | undefined) => void;