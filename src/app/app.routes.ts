import { Routes } from '@angular/router';
import { LoginComponent } from './components/Lib/login-component/login-component';
import { HomeComponent } from './components/routes/home-component/home-component';
import { NewProfileComponent } from './components/routes/new-profile-component/new-profile-component';
import { ProfileComponent } from './components/routes/profile-component/profile-component';
import { SplashComponent } from './components/routes/splash-component/splash-component';

export const routes: Routes = [
    { path: 'logon', component: LoginComponent },
    { path: 'splash', component: SplashComponent },
    { path: 'profile', component: ProfileComponent },
    { path: 'registration', component: NewProfileComponent },
    { path: 'home', component: HomeComponent },
    { path: '',   redirectTo: 'splash', pathMatch: 'full'}
];
