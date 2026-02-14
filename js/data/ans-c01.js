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
          title: 'Design a solution that incorporates edge network services to optimize user performance and traffic management for global architectures.',
          jpTitle: 'グローバルアーキテクチャ向けにユーザーパフォーマンスとトラフィック管理を最適化するために、エッジネットワークサービスを組み込んだソリューションを設計する。',
          knowledge: [
            'CloudFront distributions',
            'AWS Global Accelerator',
            'Edge security (WAF, Shield)',
            'Lambda@Edge functions',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
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
          ],
        },
        {
          id: '1.2',
          title: 'Design DNS solutions that meet public, private, and hybrid requirements.',
          jpTitle: 'パブリック、プライベート、ハイブリッドの要件を満たすDNS ソリューションを設計する。',
          knowledge: [
            'Route 53 public/private hosted zones',
            'Route 53 Resolver (inbound/outbound)',
            'DNSSEC, TTL, Aliases',
            'Hybrid DNS architectures',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
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
          ],
        },
        {
          id: '1.3',
          title: 'Design solutions that integrate load balancing to meet high availability, scalability, and security requirements.',
          jpTitle: '高可用性、スケーラビリティ、セキュリティ要件を満たすようにロードバランシングを統合するソリューションを設計する。',
          knowledge: [
            'Direct Connect (DX) gateway',
            'Site-to-Site VPN',
            'Transit Gateway connect attachments',
            'Direct Connect MACsec',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
                {
                  title: 'Transit Gatewayを使用したアクティブ/アクティブなVPN接続の作成',
                  url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/creating-active-active-vpn-connections-with-aws-transit-gateway/',
                  note: 'Official Blog: VPN Architecture',
                },
              ],
            },
            {
              key: 'guides',
              label: '開発者ガイド',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
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
          id: '1.4',
          title: ' Define logging and monitoring requirements across AWS and hybrid networks.',
          jpTitle: 'AWS とハイブリッドネットワーク全体でログ記録とモニタリングの要件を定義する。',
          knowledge: [
            'Direct Connect (DX) gateway',
            'Site-to-Site VPN',
            'Transit Gateway connect attachments',
            'Direct Connect MACsec',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
                {
                  title: 'Transit Gatewayを使用したアクティブ/アクティブなVPN接続の作成',
                  url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/creating-active-active-vpn-connections-with-aws-transit-gateway/',
                  note: 'Official Blog: VPN Architecture',
                },
              ],
            },
            {
              key: 'guides',
              label: '開発者ガイド',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
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
          id: '1.5',
          title: 'Design a routing strategy and connectivity architecture between on-premises networks and the AWS Cloud.',
          jpTitle: ' オンプレミスネットワークと AWS クラウド間のルーティング戦略と接続アーキテクチャを設計する。',
          knowledge: [
            'BGP',
            'BGP routing (ASN, prefixes, MED, AS_PATH)',
            'スタティックルーティングとダイナミックルーティング',
            'VLAN',
            'リンクアグリゲーション（LAG）',
            'ジャンボフレーム (MTU)',
            'Generic Routing Encapsulation (GRE)',
            'IPsec',
            'ハイブリッド接続',
            'トラフィックパターン（ロードシェアリング、アクティブ/パッシブ）',
            'SD-WAN',
            'オーバーレイネットワーク',
            'Transit Gateway Connect',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'AWS Blogs',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
                {
                    title: 'Direct Connect を使用したアクティブ/パッシブな BGP 接続の作成',
                    url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/creating-active-passive-bgp-connections-over-aws-direct-connect/',
                    note: 'Networking: Intermediate (Level 200)',
                },
                {
                    title: 'Direct Connect 接続への MACsec セキュリティの追加',
                    url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/adding-macsec-security-to-aws-direct-connect-connections/',
                    note: 'Networking: Foundational (Level 100)',
                },
                {
                    title: 'データセンターからクラウド接続までの AWS Direct Connect レイヤー 1 の説明',
                    url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/aws-direct-connect-layer-1-explained-from-data-centers-to-cloud-connectivity/',
                    note: 'Networking: Advanced (Level 300)',
                },
                {
                    title: 'AWS Direct Connect Gateway を使用したハイブリッドクラウドアーキテクチャ',
                    url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/hybrid-cloud-architectures-using-aws-direct-connect-gateway/',
                    note: 'Networking: Advanced (Level 300)',
                },
                {
                    title: 'Citrix SD-WAN と AWS Transit Gateway Connect を使用してハイブリッドクラウドを導入する',
                    url: 'https://aws.amazon.com/blogs/apn/embracing-hybrid-cloud-with-citrix-sd-wan-and-aws-transit-gateway-connect/',
                    note: 'APN Blogs: Intermediate (Level 200)',
                },
                {
                    title: 'SD-WAN デバイスを AWS Transit Gateway と AWS Direct Connect に統合する',
                    url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/integrate-sd-wan-devices-with-aws-transit-gateway-and-aws-direct-connect/',
                    note: 'Networking: Advanced (Level 300)',
                },
                {
                    title: 'AWS Transit Gateway Connect を使用したハイブリッドネットワークのセグメンテーション',
                    url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/segmenting-hybrid-networks-with-aws-transit-gateway-connect/',
                    note: 'Networking: Advanced (Level 300)',
                },
                {
                    title: 'AWS site-to-site VPN: パフォーマンスを最適化するための適切なオプション',
                    url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/aws-site-to-site-vpn-choosing-the-right-options-to-optimize-performance/',
                    note: 'Networking: Expert (Level 400)',
                }
              ],
            },
            {
                key: 'whitepapers',
                label: 'AWS Whitepapers',
                iconClass: 'fas fa-file-alt',
                iconColorClass: 'text-green-500',
                items: [
                  {
                    title: 'ハイブリッド接続',
                    url: 'https://docs.aws.amazon.com/ja_jp/whitepapers/latest/hybrid-connectivity/hybrid-connectivity.html',
                    note: 'Hybrid Connectivity',
                  },
                  {
                    title: 'スケーラブルで安全なマルチVPCネットワークインフラストラクチャの構築',
                    url: 'https://docs.aws.amazon.com/ja_jp/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/direct-connect.html',
                    note: 'Building a Scalable and Secure Multi-VPC Network Infrastructure',
                  },
                  {
                    title: 'リモートネットワークから Amazon VPC への接続オプション',
                    url: 'https://docs.aws.amazon.com/ja_jp/whitepapers/latest/aws-vpc-connectivity-options/network-to-amazon-vpc-connectivity-options.html',
                    note: 'VPC Connectivity Options',
                  }
                ],
            },
            {
              key: 'guides',
              label: 'ユーザーガイド',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                    title: 'Direct Connect VIF（仮想インターフェース） とホスト型 VIF',
                    url: 'https://docs.aws.amazon.com/ja_jp/directconnect/latest/UserGuide/WorkingWithVirtualInterfaces.html',
                    note: 'Direct Connect User Guide',
                },
                {
                    title: 'Direct Connect ルーティングポリシーと BGP コミュニティ',
                    url: 'https://docs.aws.amazon.com/ja_jp/directconnect/latest/UserGuide/routing-and-bgp.html',
                    note: 'Direct Connect User Guide',
                }
              ],
            },
          ],
        },
                {
          id: '1.6',
          title: 'Design a routing strategy and connectivity architecture that include multiple AWS accounts, AWS Regions, and VPCs to support different connectivity patterns.',
          jpTitle: 'さまざまな接続パターンをサポートするために、複数の AWS アカウントや AWS リージョン、VPC を含むルーティング戦略と接続アーキテクチャを設計する。',
          knowledge: [
            'Direct Connect (DX) gateway',
            'Site-to-Site VPN',
            'Transit Gateway connect attachments',
            'Direct Connect MACsec',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
                {
                  title: 'Transit Gatewayを使用したアクティブ/アクティブなVPN接続の作成',
                  url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/creating-active-active-vpn-connections-with-aws-transit-gateway/',
                  note: 'Official Blog: VPN Architecture',
                },
              ],
            },
            {
              key: 'guides',
              label: '開発者ガイド',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Direct Connect の耐障害性に関する推奨事項',
                  url: 'https://docs.aws.amazon.com/directconnect/latest/UserGuide/recommendations.html',
                  note: 'Official Guide: DX Resiliency',
                },
              ],
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
          title: 'Implement routing and connectivity between on-premises networks and the AWS Cloud.',
          jpTitle: 'オンプレミスネットワークと AWS クラウド間にルーティングと接続を実装する。',
          knowledge: [
            'BGP routing (ASN, prefixes, MED, AS_PATH)',
            'TGW Route Tables',
            'VPC Peering vs TGW',
            'IPv6 implementation',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
                {
                  title: 'Gateway Load BalancerとTransit Gatewayを使用した集中型検査アーキテクチャ',
                  url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/centralized-inspection-architecture-with-aws-gateway-load-balancer-and-aws-transit-gateway/',
                  note: 'Official Blog: Traffic Inspection',
                },
              ],
            },
            {
              key: 'guides',
              label: '開発者ガイド',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Direct Connect ルーティングポリシーと BGP コミュニティ',
                  url: 'https://docs.aws.amazon.com/ja_jp/directconnect/latest/UserGuide/routing-and-bgp.html',
                  note: 'Official Docs: Routing Policies',
                },
              ],
            },
          ],
        },
        {
          id: '2.2',
          title: 'Implement routing and connectivity across multiple AWS accounts, Regions, and VPCs to support different connectivity patterns.',
          jpTitle: 'さまざまな接続パターンをサポートするために、複数のAWS アカウント、リージョン、VPC にルーティングと接続を実装する。',
          knowledge: [
            'VPC Endpoints (Interface vs Gateway)',
            'PrivateLink provider/consumer',
            'Load Balancers (NLB, ALB, GWLB)',
            'EKS CNI networking',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
                {
                  title: 'マルチアカウント環境でのPrivateLinkサービスアクセスのガバナンスとセキュリティ',
                  url: 'https://aws.amazon.com/blogs/security/governing-and-securing-aws-privatelink-service-access-at-scale-in-multi-account-environments/',
                  note: 'Official Blog: PrivateLink Security',
                },
              ],
            },
            {
              key: 'guides',
              label: '開発者ガイド',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
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
          id: '2.3',
          title: 'Implement complex hybrid and multi-account DNS architectures.',
          jpTitle: '複雑なハイブリッドおよびマルチアカウント DNS アーキテクチャを実装する。',
          knowledge: [
            'VPC Endpoints (Interface vs Gateway)',
            'PrivateLink provider/consumer',
            'Load Balancers (NLB, ALB, GWLB)',
            'EKS CNI networking',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
                {
                  title: 'マルチアカウント環境でのPrivateLinkサービスアクセスのガバナンスとセキュリティ',
                  url: 'https://aws.amazon.com/blogs/security/governing-and-securing-aws-privatelink-service-access-at-scale-in-multi-account-environments/',
                  note: 'Official Blog: PrivateLink Security',
                },
              ],
            },
            {
              key: 'guides',
              label: '開発者ガイド',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
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
          id: '2.4',
          title: 'Automate and configure network infrastructure.',
          jpTitle: 'ネットワークインフラストラクチャを自動化して構成する。',
          knowledge: [
            'VPC Endpoints (Interface vs Gateway)',
            'PrivateLink provider/consumer',
            'Load Balancers (NLB, ALB, GWLB)',
            'EKS CNI networking',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
                {
                  title: 'マルチアカウント環境でのPrivateLinkサービスアクセスのガバナンスとセキュリティ',
                  url: 'https://aws.amazon.com/blogs/security/governing-and-securing-aws-privatelink-service-access-at-scale-in-multi-account-environments/',
                  note: 'Official Blog: PrivateLink Security',
                },
              ],
            },
            {
              key: 'guides',
              label: '開発者ガイド',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon EKS ベストプラクティスガイド: VPC CNI',
                  url: 'https://docs.aws.amazon.com/eks/latest/best-practices/vpc-cni.html',
                  note: 'Official Docs: EKS VPC CNI',
                },
              ],
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
          title: 'Maintain routing and connectivity on AWS and hybrid networks.',
          jpTitle: 'AWS とハイブリッドネットワークでルーティングと接続性を維持する。',
          knowledge: [
            'VPC Flow Logs',
            'VPC Traffic Mirroring',
            'CloudWatch Metrics/Alarms for network',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
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
          ],
        },
        {
          id: '3.2',
          title: 'Monitor and analyze network traffic to troubleshoot and optimize connectivity patterns.',
          jpTitle: 'ネットワークトラフィックをモニタリングおよび分析して、接続パターンのトラブルシューティングと最適化を行う。',
          knowledge: [
            'Data transfer cost reduction',
            'Jumbo frames (MTU)',
            'Enhanced Networking (ENA, EFA)',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
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
          id: '3.3',
          title: 'Optimize AWS networks for performance, reliability, and costeffectiveness.',
          jpTitle: 'AWS ネットワークを最適化して、パフォーマンス、信頼性、費用対効果を高める。',
          knowledge: [
            'Data transfer cost reduction',
            'Jumbo frames (MTU)',
            'Enhanced Networking (ENA, EFA)',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
                {
                  title: '一般的なアーキテクチャのデータ転送コストの概要',
                  url: 'https://aws.amazon.com/blogs/architecture/overview-of-data-transfer-costs-for-common-architectures/',
                  note: 'Official Blog: Cost Optimization',
                },
              ],
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
          title: 'Implement and maintain network features to meet security and compliance needs and requirements.',
          jpTitle: 'セキュリティとコンプライアンスのニーズと要件を満たすために、ネットワーク機能を実装し、保守する。',
          knowledge: [
            'Security Groups vs NACLs',
            'AWS Network Firewall',
            'WAF & Shield Advanced',
            'Encryption in transit (TLS, VPN, MACsec)',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
                {
                  title: 'AWS Network Firewallのデプロイモデル',
                  url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/deployment-models-for-aws-network-firewall/',
                  note: 'Official Blog: Firewall Deployment',
                },
              ],
            },
            {
              key: 'guides',
              label: '開発者ガイド',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS WAFの実装ガイドライン: レイヤー7でのDDoS攻撃',
                  url: 'https://docs.aws.amazon.com/whitepapers/latest/guidelines-for-implementing-aws-waf/ddos-attacks-at-layer-7.html',
                  note: 'Official Whitepaper: DDoS Mitigation',
                },
              ],
            },
          ],
        },
        {
          id: '4.2',
          title: 'Validate and audit security by using network monitoring and logging services.',
          jpTitle: 'ネットワークのモニタリングおよびログ記録サービスを使用してセキュリティを検証し、監査する。',
          knowledge: [
            'Security Groups vs NACLs',
            'AWS Network Firewall',
            'WAF & Shield Advanced',
            'Encryption in transit (TLS, VPN, MACsec)',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
                {
                  title: 'AWS Network Firewallのデプロイモデル',
                  url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/deployment-models-for-aws-network-firewall/',
                  note: 'Official Blog: Firewall Deployment',
                },
              ],
            },
            {
              key: 'guides',
              label: '開発者ガイド',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS WAFの実装ガイドライン: レイヤー7でのDDoS攻撃',
                  url: 'https://docs.aws.amazon.com/whitepapers/latest/guidelines-for-implementing-aws-waf/ddos-attacks-at-layer-7.html',
                  note: 'Official Whitepaper: DDoS Mitigation',
                },
              ],
            },
          ],
        },
        {
          id: '4.3',
          title: 'Implement and maintain confidentiality of data and communications of the network.',
          jpTitle: ' ネットワークのデータと通信の機密性を実装し、保守する。',
          knowledge: [
            'Security Groups vs NACLs',
            'AWS Network Firewall',
            'WAF & Shield Advanced',
            'Encryption in transit (TLS, VPN, MACsec)',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'ブログ',
              iconClass: 'fas fa-book',
              iconColorClass: 'text-orange-500',
              items: [
                {
                  title: 'AWS Network Firewallのデプロイモデル',
                  url: 'https://aws.amazon.com/blogs/networking-and-content-delivery/deployment-models-for-aws-network-firewall/',
                  note: 'Official Blog: Firewall Deployment',
                },
              ],
            },
            {
              key: 'guides',
              label: '開発者ガイド',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
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
    },
  ],
};
