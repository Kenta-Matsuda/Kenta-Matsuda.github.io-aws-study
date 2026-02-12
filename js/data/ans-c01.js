export const ANS_C01 = {
  id: 'ans-c01',
  code: 'ANS-C01',
  shortLabel: 'ANS',
  title: 'AWS Certified Advanced Networking - Specialty',
  subtitle: '試験ガイド完全準拠の合格ナビゲーター',
  domains: [
    {
      id: 1,
      title: 'Network Design',
      jpTitle: 'ネットワーク設計',
      weight: 30,
      color: '#3b82f6',
      description: 'エッジサービス、DNS、ハイブリッド接続を含む全体的なネットワークアーキテクチャの設計。',
      tasks: [
        {
          id: '1.1',
          title: 'Design a solution for edge network services',
          jpTitle: 'エッジネットワークサービスのソリューション設計',
          knowledge: [
            'CloudFront distributions',
            'AWS Global Accelerator',
            'Edge security (WAF, Shield)',
            'Lambda@Edge functions',
          ],
          blogs: [
            {
              title: 'Global Acceleratorでアプリケーションのパフォーマンスを向上させる',
              url: 'https://aws.amazon.com/jp/blogs/networking-and-content-delivery/use-aws-global-accelerator-to-improve-application-performance/',
              note: 'Official Blog: Availability & Performance',
            },
            {
              title: '複数のリージョンにまたがるアクティブ/アクティブなアーキテクチャの構築',
              url: 'https://aws.amazon.com/blogs/storage/building-an-active-active-latency-based-application-across-multiple-regions/',
              note: 'Official Blog: Multi-Region Architecture',
            },
            {
              title: 'CloudFrontとWAFを使用してウェブサイトを高速化および保護する',
              url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/accelerate-and-protect-your-websites-using-amazon-cloudfront-and-aws-waf/',
              note: 'Official Blog: Security & Acceleration',
            },
          ],
        },
        {
          id: '1.2',
          title: 'Design a DNS solution',
          jpTitle: 'DNSソリューションの設計',
          knowledge: [
            'Route 53 public/private hosted zones',
            'Route 53 Resolver (inbound/outbound)',
            'DNSSEC, TTL, Aliases',
            'Hybrid DNS architectures',
          ],
          blogs: [
            {
              title: 'Route 53 Resolverエンドポイントを使用したDNS高可用性の実現',
              url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/how-to-achieve-dns-high-availability-with-route-53-resolver-endpoints/',
              note: 'Official Blog: DNS High Availability',
            },
            {
              title: 'Route 53とTransit Gatewayを使用したハイブリッドクラウドのDNS一元管理',
              url: 'https://aws.amazon.com/blogs/security/centralized-dns-management-of-hybrid-cloud-with-amazon-route-53-and-aws-transit-gateway/',
              note: 'Official Blog: Centralized Management',
            },
          ],
        },
        {
          id: '1.3',
          title: 'Design a solution for hybrid connectivity',
          jpTitle: 'ハイブリッド接続のソリューション設計',
          knowledge: [
            'Direct Connect (DX) gateway',
            'Site-to-Site VPN',
            'Transit Gateway connect attachments',
            'Direct Connect MACsec',
          ],
          blogs: [
            {
              title: 'Transit Gatewayを使用したアクティブ/アクティブなVPN接続の作成',
              url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/creating-active-active-vpn-connections-with-aws-transit-gateway/',
              note: 'Official Blog: VPN Architecture',
            },
            {
              title: 'AWS Direct Connect の耐障害性に関する推奨事項',
              url: 'https://docs.aws.amazon.com/directconnect/latest/UserGuide/recommendations.html',
              note: 'Official Guide: DX Resiliency',
            },
          ],
        },
                {
          id: '1.4',
          title: 'Design a solution for hybrid connectivity',
          jpTitle: 'ハイブリッド接続のソリューション設計',
          knowledge: [
            'Direct Connect (DX) gateway',
            'Site-to-Site VPN',
            'Transit Gateway connect attachments',
            'Direct Connect MACsec',
          ],
          blogs: [
            {
              title: 'Transit Gatewayを使用したアクティブ/アクティブなVPN接続の作成',
              url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/creating-active-active-vpn-connections-with-aws-transit-gateway/',
              note: 'Official Blog: VPN Architecture',
            },
            {
              title: 'AWS Direct Connect の耐障害性に関する推奨事項',
              url: 'https://docs.aws.amazon.com/directconnect/latest/UserGuide/recommendations.html',
              note: 'Official Guide: DX Resiliency',
            },
          ],
        },
                {
          id: '1.5',
          title: 'Design a solution for hybrid connectivity',
          jpTitle: 'ハイブリッド接続のソリューション設計',
          knowledge: [
            'Direct Connect (DX) gateway',
            'Site-to-Site VPN',
            'Transit Gateway connect attachments',
            'Direct Connect MACsec',
          ],
          blogs: [
            {
              title: 'Transit Gatewayを使用したアクティブ/アクティブなVPN接続の作成',
              url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/creating-active-active-vpn-connections-with-aws-transit-gateway/',
              note: 'Official Blog: VPN Architecture',
            },
            {
              title: 'AWS Direct Connect の耐障害性に関する推奨事項',
              url: 'https://docs.aws.amazon.com/directconnect/latest/UserGuide/recommendations.html',
              note: 'Official Guide: DX Resiliency',
            },
          ],
        },
                {
          id: '1.6',
          title: 'Design a solution for hybrid connectivity',
          jpTitle: 'ハイブリッド接続のソリューション設計',
          knowledge: [
            'Direct Connect (DX) gateway',
            'Site-to-Site VPN',
            'Transit Gateway connect attachments',
            'Direct Connect MACsec',
          ],
          blogs: [
            {
              title: 'Transit Gatewayを使用したアクティブ/アクティブなVPN接続の作成',
              url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/creating-active-active-vpn-connections-with-aws-transit-gateway/',
              note: 'Official Blog: VPN Architecture',
            },
            {
              title: 'AWS Direct Connect の耐障害性に関する推奨事項',
              url: 'https://docs.aws.amazon.com/directconnect/latest/UserGuide/recommendations.html',
              note: 'Official Guide: DX Resiliency',
            },
          ],
        },
      ],
    },
    {
      id: 2,
      title: 'Network Implementation',
      jpTitle: 'ネットワーク実装',
      weight: 26,
      color: '#10b981',
      description: 'ルーティングプロトコル、接続性、およびオートメーションの実装。',
      tasks: [
        {
          id: '2.1',
          title: 'Implement routing and connectivity',
          jpTitle: 'ルーティングと接続性の実装',
          knowledge: [
            'BGP routing (ASN, prefixes, MED, AS_PATH)',
            'TGW Route Tables',
            'VPC Peering vs TGW',
            'IPv6 implementation',
          ],
          blogs: [
            {
              title: 'Gateway Load BalancerとTransit Gatewayを使用した集中型検査アーキテクチャ',
              url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/centralized-inspection-architecture-with-aws-gateway-load-balancer-and-aws-transit-gateway/',
              note: 'Official Blog: Traffic Inspection',
            },
            {
              title: 'Direct Connect ルーティングポリシーと BGP コミュニティ',
              url: 'https://docs.aws.amazon.com/ja_jp/directconnect/latest/UserGuide/routing-and-bgp.html',
              note: 'Official Docs: Routing Policies',
            },
          ],
        },
        {
          id: '2.2',
          title: 'Configure network integration with application services',
          jpTitle: 'アプリケーションサービスとのネットワーク統合設定',
          knowledge: [
            'VPC Endpoints (Interface vs Gateway)',
            'PrivateLink provider/consumer',
            'Load Balancers (NLB, ALB, GWLB)',
            'EKS CNI networking',
          ],
          blogs: [
            {
              title: 'マルチアカウント環境でのPrivateLinkサービスアクセスのガバナンスとセキュリティ',
              url: 'https://aws.amazon.com/blogs/security/governing-and-securing-aws-privatelink-service-access-at-scale-in-multi-account-environments/',
              note: 'Official Blog: PrivateLink Security',
            },
            {
              title: 'Amazon EKS ベストプラクティスガイド: VPC CNI',
              url: 'https://docs.aws.amazon.com/eks/latest/best-practices/vpc-cni.html',
              note: 'Official Docs: EKS VPC CNI',
            },
          ],
        },
      ],
    },
    {
      id: 3,
      title: 'Network Management and Operation',
      jpTitle: 'ネットワークの管理と運用',
      weight: 20,
      color: '#f59e0b',
      description: 'ネットワークの監視、トラブルシューティング、最適化。',
      tasks: [
        {
          id: '3.1',
          title: 'Monitor and analyze network traffic',
          jpTitle: 'ネットワークトラフィックの監視と分析',
          knowledge: [
            'VPC Flow Logs',
            'VPC Traffic Mirroring',
            'CloudWatch Metrics/Alarms for network',
          ],
          blogs: [
            {
              title: 'Amazon Athena統合を使用してVPCフローログを分析する',
              url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/analyze-vpc-flow-logs-with-point-and-click-amazon-athena-integration/',
              note: 'Official Blog: Flow Logs Analysis',
            },
            {
              title: 'VPCトラフィックミラーリングを使用してAWSインフラストラクチャを監視および保護する',
              url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/using-vpc-traffic-mirroring-to-monitor-and-secure-your-aws-infrastructure/',
              note: 'Official Blog: Traffic Mirroring',
            },
          ],
        },
        {
          id: '3.2',
          title: 'Optimize network performance and cost',
          jpTitle: 'ネットワークパフォーマンスとコストの最適化',
          knowledge: [
            'Data transfer cost reduction',
            'Jumbo frames (MTU)',
            'Enhanced Networking (ENA, EFA)',
          ],
          blogs: [
            {
              title: '一般的なアーキテクチャのデータ転送コストの概要',
              url: 'https://aws.amazon.com/blogs/architecture/overview-of-data-transfer-costs-for-common-architectures/',
              note: 'Official Blog: Cost Optimization',
            },
          ],
        },
      ],
    },
    {
      id: 4,
      title: 'Network Security, Compliance, and Governance',
      jpTitle: 'ネットワークのセキュリティ、コンプライアンス、ガバナンス',
      weight: 24,
      color: '#ef4444',
      description: 'セキュリティコントロールの実装、脅威からの保護。',
      tasks: [
        {
          id: '4.1',
          title: 'Implement and maintain network security',
          jpTitle: 'ネットワークセキュリティの実装と維持',
          knowledge: [
            'Security Groups vs NACLs',
            'AWS Network Firewall',
            'WAF & Shield Advanced',
            'Encryption in transit (TLS, VPN, MACsec)',
          ],
          blogs: [
            {
              title: 'AWS Network Firewallのデプロイモデル',
              url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/deployment-models-for-aws-network-firewall/',
              note: 'Official Blog: Firewall Deployment',
            },
            {
              title: 'AWS WAFの実装ガイドライン: レイヤー7でのDDoS攻撃',
              url: 'https://docs.aws.amazon.com/whitepapers/latest/guidelines-for-implementing-aws-waf/ddos-attacks-at-layer-7.html',
              note: 'Official Whitepaper: DDoS Mitigation',
            },
          ],
        },
      ],
    },
  ],
};
