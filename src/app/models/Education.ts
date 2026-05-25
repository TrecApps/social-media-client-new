import { Subject } from "./EduSubject";
import { FeatureShow } from "./Model";

export type EduDegree =     "HS_DIPLOMA" |
    "HS_GED" |
    "ASSOCIATE" |
    "ASSOCIATE_ART" |
    "ASSOCIATE_SCI" |
    "ASSOCIATE_APP_SCI" |
    "ASSOCIATE_ENG" |
    "ASSOCIATE_APP_ARTS" |
    "BACH" |
    "BACH_ARTS" |
    "BACH_SCI" |
    "BACH_FINE_ARTS" |
    "BACH_BUS_ADMIN" |
    "BACH_ENG" |
    "PROF_DOCTOR" |
    "PROF_MED" |
    "PROF_PHARM" |
    "MS" |
    "MS_ARTS" |
    "MS_FINE_ARTS" |
    "MS_SCI" |
    "MS_RESEARCH" |
    "MS_BUS_ADMIN" |
    "MS_PHIL" |
    "PHD" |
    "DOCTOR_EDU" |
    "DOCTOR_BUS_ADMIN" |
    "DOCTOR_ENG" |
    "DOCTOR_SOC_SCI" |
    "DOCTORATE";

export interface EduDegreeMap {
    degree: EduDegree;
    display: string
}

export const eduDegreeMap : EduDegreeMap[] = [
    {
        degree: "HS_DIPLOMA",
        display: "High School Diploma"
    },
    {
        degree: "HS_GED",
        display: "High School GED"
    },
    {
        degree: "ASSOCIATE",
        display: "Associate's Degree"
    },
    {
        degree: "ASSOCIATE_ART",
        display: "Associate of Arts"
    },
     {
        degree: "ASSOCIATE_SCI",
        display: "Associate of Science"
    },
     {
        degree: "ASSOCIATE_APP_SCI",
        display: "Associate of Applied Science"
    },
     {
        degree: "ASSOCIATE_ENG",
        display: "Associate of Engineering"
    },
     {
        degree: "ASSOCIATE_APP_ARTS",
        display: "Associate of Applied Arts"
    },
     {
        degree: "BACH",
        display: "Bachelor's Degree"
    },
     {
        degree: "BACH_ARTS",
        display: "Bachelor of Arts"
    },
     {
        degree: "BACH_SCI",
        display: "Bachelor of Science"
    },
     {
        degree: "BACH_FINE_ARTS",
        display: "Bachelor of Fine Arts"
    },
     {
        degree: "BACH_BUS_ADMIN",
        display: "Bachelor of Business Administration"
    },
     {
        degree: "BACH_ENG",
        display: "Bachelor of Engineering"
    },
     {
        degree: "PROF_DOCTOR",
        display: "Professional: Juris Doctor"
    },
     {
        degree: "PROF_MED",
        display: "Professional: Doctor of Medicine"
    },
     {
        degree: "PROF_PHARM",
        display: "Professional: Doctor of Pharmacy"
    },
     {
        degree: "MS",
        display: "Master's Degree"
    },
     {
        degree: "MS_ARTS",
        display: "Master of Arts"
    },
     {
        degree: "MS_FINE_ARTS",
        display: "Master of Fine Arts"
    },
     {
        degree: "MS_SCI",
        display: "Master of Science"
    },
     {
        degree: "MS_RESEARCH",
        display: "Master of Research"
    },
     {
        degree: "MS_BUS_ADMIN",
        display: "Master of Business Administration"
    },
     {
        degree: "MS_PHIL",
        display: "Master of Philosophy"
    },
     {
        degree: "PHD",
        display: "Doctor of Philosophy (PhD)"
    },
     {
        degree: "DOCTOR_EDU",
        display: "Doctor of Education"
    },
     {
        degree: "DOCTOR_BUS_ADMIN",
        display: "Doctor of Business Administration"
    },
     {
        degree: "DOCTOR_ENG",
        display: "Doctor of Engineering"
    },
     {
        degree: "DOCTOR_SOC_SCI",
        display: "Doctor of Social Sciences"
    },
     {
        degree: "DOCTORATE",
        display: "Doctorate"
    }
] 



export type Month = 
    "JANUARY" | "FEBRUARY" | "MARCH" |
    "APRIL" | "MAY" | "JUNE" | 
    "JULY" | "AUGUST" | "SEPTEMBER" |
    "OCTOBER" | "NOVEMBER" | "DECEMBER";

export const monthList: Month[] = [
    "JANUARY", "FEBRUARY", "MARCH",
    "APRIL", "MAY", "JUNE", 
    "JULY", "AUGUST", "SEPTEMBER",
    "OCTOBER", "NOVEMBER", "DECEMBER"
] 

export interface MonthYear {
    month: Month;
    year: number;
}

export class Education {
    showEducation: FeatureShow = "PUBLIC";
    allowAnalytics: boolean = true;

    schoolId: string = "";
    schoolName: string = "";
    degree: EduDegree | "" = "";

    majors: Subject[] = [];
    minors: Subject[] = [];

    gpa: number = 0;
    showGpa: boolean = false;

    start: MonthYear = {
        month: "JANUARY",
        year: new Date().getFullYear()
    };
    graduation: MonthYear = {
        month: "DECEMBER",
        year: new Date().getFullYear()
    };
}