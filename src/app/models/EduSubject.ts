

export type Subject = "ART" |
    "BIOLOGY" |
    "CHEMISTRY" |
    "COMPUTER_SCIENCE" |
    "ELECTRICAL_ENGINEERING" |
    "ENGINEERING" |
    "GEOGRAPHY" |
    "GEOLOGY" |
    "HISTORY";

export interface SubjectMap {
    subject: Subject;
    display: string;
}

export const subjectMap: SubjectMap[] = [
         {
        subject: "ART",
        display:  "Art"
    },
     {
        subject: "BIOLOGY",
        display:  "Biology"
    },
     {
        subject: "CHEMISTRY",
        display:  "Chemistry"
    },
     {
        subject: "COMPUTER_SCIENCE",
        display:  "Computer Science"
    },
     {
        subject: "ELECTRICAL_ENGINEERING",
        display:  "Electrical Engineering"
    },
     {
        subject: "ENGINEERING",
        display:  "Engineering"
    },
     {
        subject: "GEOGRAPHY",
        display:  "Geography"
    },
     {
        subject: "GEOLOGY",
        display:  "Geology"
    },
     {
        subject: "HISTORY",
        display:  "History"
    }
]