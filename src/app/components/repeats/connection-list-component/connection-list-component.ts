import { AfterViewInit, Component } from '@angular/core';
import { ConnectionDetails, ConnectionService } from '../../../services/conection-service';
import { environment } from '../../../environment/environment';
import { ElementItemDirective } from '../../../directives/element-item-directive';
import { TabComponent, TabOption } from '../../Lib/tab-component/tab-component';
// import { MessageService } from '../../../services/message-service';

@Component({
  selector: 'app-connection-list-component',
  imports: [TabComponent, ElementItemDirective],
  templateUrl: './connection-list-component.html',
  styleUrl: './connection-list-component.css'
})
export class ConnectionListComponent implements AfterViewInit{

  connectionDetails: ConnectionDetails[] = [];

  connectionService: ConnectionService;

  tabList: TabOption[] = [
    {
      showTitle: "Your Followers",
      actTitle: "follower"
    },
    {
      showTitle: "Connections",
      actTitle: "connect"
    },
    {
      showTitle: "Those you Follow",
      actTitle: "followee"
    },
    {
      showTitle: "Connection Requests",
      actTitle: "request"
    }
  ]

  mode: string = "follower";

  imageBase: string = `${environment.image_service_url}Images/profile/`;

  app: string = environment.app_name;

  constructor(cs: ConnectionService
  //  , private messageService: MessageService
  ) {
    this.connectionService = cs;
  }

  // prepMessage(id: string){
  //   this.messageService.setToConveration(id);
  // }

  ngAfterViewInit(): void {
    this.prepMode();
  }

  onTabSelect(mode: string){
    this.mode = mode;
    this.prepMode();
  }

  prepMode(){
    switch(this.mode){
      case "follower":
        this.connectionDetails = this.connectionService.connections.followers;
        break;
      case "followee":
        this.connectionDetails = this.connectionService.connections.followees;
        break;
      case "connect":
        this.connectionDetails = this.connectionService.connections.twoWayConnections;
        break;
      case "request":
        this.connectionDetails = this.connectionService.connections.inRequests.concat(this.connectionService.connections.outRequests);

        this.connectionDetails.sort((a: ConnectionDetails, b: ConnectionDetails) => {
          let bVal = 0;
          let aVal = 0;
          try{
            aVal = a.entry.made ? Number.parseFloat(a.entry.made.toString()) : 0;
          } catch(e) {
            aVal = a.entry.made.getTime()
          }

          try{
            bVal = b.entry.made ? Number.parseFloat(b.entry.made.toString()) : 0;
          } catch(e) {
            bVal = b.entry.made.getTime()
          }
    
          return bVal - aVal;
        })
    }
  }

  assessEntry(detail: ConnectionDetails): string {
    if(this.mode == "connect") return "connected";
    if(this.mode == "request"){
      if(detail.entry.id.followee == detail.profileDetails.id){
        // This person made a request to you
        return "requestee";
      }
      // You made a request to this person
      return "requester";
    }

    if(this.mode == "follower"){
      let ret = "follower";
      if(this.connectionIncluded(detail, this.connectionService.connections.followees)){
        ret = ret.concat("-vice");
      }
      return ret;
    }

    let ret = "followee";
    if(this.connectionIncluded(detail, this.connectionService.connections.followers)){
        ret = ret.concat("-vice");
      }
      return ret;
  }

  connectionIncluded(detail:ConnectionDetails, details: ConnectionDetails[]): boolean {
    for(let d of details){
      if(d.profileDetails.id == detail.profileDetails.id) return true;
    }
    return false;
  }


  endConnection(detail: ConnectionDetails){
    this.connectionService.editConnection("unfollow", detail.profileDetails.id).subscribe({
      next: () => {
        this.connectionDetails = this.connectionDetails.filter((d: ConnectionDetails) => d.profileDetails.id != detail.profileDetails.id);
      }
    })
  }

  approveConnection(detail:ConnectionDetails){
    this.connectionService.editConnection("approve", detail.profileDetails.id).subscribe({
      next: () => {
        if(this.mode == "connect") {
          this.connectionDetails.push(detail);
        } else if(this.mode == "request") {
          this.connectionDetails = this.connectionDetails.filter((d: ConnectionDetails) => d.profileDetails.id != detail.profileDetails.id); 
        }

        this.connectionDetails = this.connectionDetails.filter((d: ConnectionDetails) => d.profileDetails.id != detail.profileDetails.id); 
        this.connectionService.connections.inRequests = 
          this.connectionService.connections.inRequests.filter((d: ConnectionDetails) => d.profileDetails.id != detail.profileDetails.id); 
        detail.entry.accepted = new Date();
        this.connectionService.connections.twoWayConnections.push(detail);
      }
    })
  }

  makeConnection(detail: ConnectionDetails) {
    this.connectionService.editConnection("follow", detail.profileDetails.id).subscribe({
      next: () => {
        if(detail.entry.oneWay){
          let newDetail: ConnectionDetails = {
            entry: {
              id: {
                followee: detail.entry.id.follower,
                follower: detail.entry.id.followee
              },
              made: new Date(),
              accepted: undefined,
              oneWay: true
            },
            profileDetails: detail.profileDetails
          };
          if(this.mode == "followees")
          {
            this.connectionDetails.push(newDetail);
          }

          this.connectionService.connections.followees.push(newDetail);
        } 

        // Unlikely to be a two way
      }
    })
  }



}
