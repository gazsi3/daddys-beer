import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FriendsService } from './services/friends.service';
import { MapComponent } from './components/map/map.component';
import { Friend } from './models/friend';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, MapComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  readonly friendsService = inject(FriendsService);

  // Bound to the "add friend" form.
  newName = '';
  newAddress = '';

  addFriend(): void {
    const name = this.newName.trim();
    const address = this.newAddress.trim();
    if (!name || !address) return;
    this.friendsService.addFriend(name, address, 1);
    this.newName = '';
    this.newAddress = '';
  }

  onName(f: Friend, value: string): void {
    this.friendsService.updateFriend(f.id, { name: value });
  }

  onAddress(f: Friend, value: string): void {
    this.friendsService.updateFriend(f.id, { address: value });
  }

  onWeight(f: Friend, value: string): void {
    const weight = Math.max(0, Number(value) || 0);
    this.friendsService.updateFriend(f.id, { weight });
  }

  onRadius(value: string): void {
    this.friendsService.setRadius(Number(value));
  }

  trackById(_: number, f: Friend): string {
    return f.id;
  }
}
